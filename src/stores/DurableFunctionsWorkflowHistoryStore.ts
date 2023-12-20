import { WorkflowActivityInstance, IWorkflowHistoryStore, WorkflowInstance, WorkflowInstanceHeader } from "./IWorkflowHistoryStore";
import { GetTableEntityResponse, TableClient, TableEntity, TableEntityResult, TableServiceClient, TableTransaction } from "@azure/data-tables";
import { deserializeError, serializeError } from "../serialize-error";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import zlib from "zlib";
import { Mutex } from "async-mutex";
import { DefaultSerializer } from "../DefaultSerializer";
import { ISerializer } from "../ISerializer";
import { isDeepStrictEqual } from "util";

interface IDurableFunctionsWorkflowHistory {
    Name: string,
    Result?: string,
    ResultBlobName?: string,
    EventId: number,
    _Timestamp: Date,
    EventType: "TaskScheduled" | "TaskCompleted" | "TaskFailed" | "ExecutionStarted" | "ExecutionCompleted",
    ExecutionId: string,
    TaskScheduledId?: number,
    Input?: string,
    InputBlobName?: string,
}

// https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-instance-management?tabs=csharp#query-instances
interface IDurableFunctionsWorkflowInstance {
    Input: string;
    CreatedTime: Date;
    Name: string;
    Version: string;
    RuntimeStatus: "Pending" | "Running" | "Completed" | "ContinuedAsNew" | "Failed" | "Terminated";
    LastUpdatedTime: Date;
    TaskHubName: string;
    CustomStatus?: string;
    ExecutionId: string;
    Output: string;
    CompletedTime?: Date,
}

export class DurableFunctionsWorkflowHistoryStore implements IWorkflowHistoryStore {
    private initialized?: boolean;
    private history: TableClient;
    private instances: TableClient;
    private largeMessages: ContainerClient;
    private mutex = new Mutex();
    private options: { connectionString: string, taskHubName: string, serializer: ISerializer };

    constructor(options: { connectionString: string, taskHubName?: string, serializer?: ISerializer }) {
        this.options = {
            connectionString: options.connectionString,
            taskHubName: options.taskHubName || "Workflow",
            serializer: options.serializer || new DefaultSerializer(),
        }

        const { connectionString, taskHubName } = this.options;
        this.history = TableClient.fromConnectionString(connectionString, `${taskHubName}History`);
        this.instances = TableClient.fromConnectionString(connectionString, `${taskHubName}Instances`);

        const blobServicesClient = BlobServiceClient.fromConnectionString(connectionString);
        this.largeMessages = blobServicesClient.getContainerClient(`${taskHubName}-largemessages`.toLowerCase());
    }

    public equal = (val1: any, val2: any): boolean => {
        return (this.options.serializer.equal || isDeepStrictEqual)(val1, val2);
    }

    private async init(): Promise<void> {
        if (this.initialized) {
            return;
        }

        await this.history.createTable();
        await this.instances.createTable();

        await this.largeMessages.createIfNotExists();

        this.initialized = true;
    }

    private toHex(n: number, padding?: number): string {
        let hex = Number(n).toString(16);
        padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex;
    }

    private getDate(date: Date): Date;
    private getDate(date: undefined): undefined;
    private getDate(date: Date | undefined): Date | undefined;
    private getDate(date: Date | undefined): Date | undefined {
        // NOTE: Somewhere in the table store api it truncates the milliseconds stored if it ends on 0.
        // eg. 2022-03-16T18:47:13.100Z is truncated to 2022-03-16T18:47:13.1Z in table storage.
        // Durable Functions Monitor Gantt chart expects dates to have 24 length, hence this small check and 
        // correction:
        if (!date) {
            return date;
        }

        let time = date.getTime();
        if (time % 10 === 0) {
            return new Date(time + 1);
        }
        return date;
    }

    public async clear(): Promise<void> {
        let tableServiceClient = TableServiceClient.fromConnectionString(this.options.connectionString);
        await tableServiceClient.deleteTable(`${this.options.taskHubName}History`);
        await tableServiceClient.deleteTable(`${this.options.taskHubName}Instances`);

        let blobServicesClient = BlobServiceClient.fromConnectionString(this.options.connectionString);
        let largeMessages = blobServicesClient.getContainerClient(`${this.options.taskHubName}-largemessages`.toLowerCase());
        await largeMessages.deleteIfExists();

        this.initialized = false;
        await this.init();
    }

    public async getInstance(id: string): Promise<WorkflowInstance | undefined> {
        return await this.mutex.runExclusive(async () => {
            await this.init();

            return this.getInstanceInternal(id);
        });
    }

    private async getInstanceInternal(id: string): Promise<WorkflowInstance | undefined> {
        async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
            return new Promise((resolve, reject) => {
                const chunks = new Array<Buffer>();
                readableStream.on("data", (data) => {
                    chunks.push(data instanceof Buffer ? data : Buffer.from(data));
                });
                readableStream.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });
                readableStream.on("error", reject);
            });
        }

        let getBlob = async (blobName: string): Promise<any | undefined> => {
            let blockBlobClient = this.largeMessages?.getBlockBlobClient(blobName);

            const downloadBlockBlobResponse = await blockBlobClient?.download();
            if (!downloadBlockBlobResponse.readableStreamBody) {
                return undefined;
            }
            let buffer = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);

            let unzipped = zlib.unzipSync(buffer).toString();
            return this.options.serializer.parse(unzipped);
        };

        let entity: GetTableEntityResponse<TableEntityResult<IDurableFunctionsWorkflowInstance>> | undefined = undefined;
        try {
            entity = await this.instances.getEntity<IDurableFunctionsWorkflowInstance>(id, "")
        } catch (e: unknown) {
            if (typeof e === 'object' && e && "statusCode" in e && e.statusCode === 404) {
                return undefined;
            }
            throw e;
        }

        let instance: WorkflowInstance = {
            instanceId: id,
            status: entity.CustomStatus as any,
            args: [],
            start: entity.CreatedTime,
            end: entity.CompletedTime,
            activities: new Array<WorkflowActivityInstance>(),
        };

        if (entity.Input) {
            if (entity.Input.indexOf("http://") === 0) {
                instance.args = await getBlob(`${id}/Input.json.gz`);
            } else {
                instance.args = this.options.serializer.parse(entity.Input);
            }
        }

        const filter = `PartitionKey eq '${id}'`;
        let historyIterator = this.history.listEntities<IDurableFunctionsWorkflowHistory>({ queryOptions: { filter } }).byPage({ maxPageSize: 50 });

        for await (const page of historyIterator) {
            for await (const entity of page) {
                if (entity.EventId > -1 && entity.EventType === "TaskScheduled") {
                    let args: Array<any>;
                    if (entity.InputBlobName) {
                        args = await getBlob(entity.InputBlobName);
                    } else {
                        if (entity.Input) {
                            args = this.options.serializer.parse(entity.Input);
                        } else {
                            args = [];
                        }
                    }

                    instance.activities.push(
                        {
                            args,
                            name: entity.Name || "",
                            start: entity["_Timestamp"],
                        },
                    );
                }

                let result: any = undefined;
                if (entity.ResultBlobName) {
                    result = await getBlob(entity.ResultBlobName);
                } else if (entity.Result) {
                    result = this.options.serializer.parse(entity.Result);
                }

                if (entity.EventType === "TaskCompleted") {
                    const taskScheduledId = entity.TaskScheduledId;
                    if (typeof taskScheduledId === "undefined") {
                        throw new Error("Expected TaskScheduledId to be set");
                    }
                    let activity = instance.activities[taskScheduledId];
                    activity.end = entity["_Timestamp"];
                    activity.result = result;
                } else if (entity.EventType === "TaskFailed") {
                    const taskScheduledId = entity.TaskScheduledId;
                    if (typeof taskScheduledId === "undefined") {
                        throw new Error("Expected TaskScheduledId to be set");
                    }
                    let activity = instance.activities[taskScheduledId];
                    activity.end = entity["_Timestamp"];
                    activity.error = result && deserializeError(result);
                }
            }
        }

        if (instance.end) {
            let output: any = undefined;
            if (entity.Output) {
                if (entity.Output.indexOf("http://") === 0) {
                    output = await getBlob(`${id}/Output.json.gz`);
                } else {
                    output = this.options.serializer.parse(entity.Output);
                }

                if (entity.RuntimeStatus === "Failed") {
                    instance.error = deserializeError(output);
                } else {
                    instance.result = output;
                }
            }
        }

        return instance;
    }

    public async setInstance(instance: WorkflowInstance): Promise<void> {
        await this.mutex.runExclusive(async () => {
            let isLarge = (data: string | undefined): boolean => {
                if (!data) {
                    return false;
                }
                let sixtyKb = 60 * 128;
                if (data && Buffer.byteLength(data) >= sixtyKb) {
                    return true;
                }
                return false;
            };
            let isLargeHistory = (row: { Input?: string, Result?: string }): boolean => {
                if (isLarge(row.Input)) {
                    return true;
                }
                if (isLarge(row.Result)) {
                    return true;
                }
                return false;
            };

            await this.init();

            let blobs = new Array<{ name: string, data?: string }>();
            let error = Object.prototype.hasOwnProperty.call(instance, "error");
            const task: TableEntity<IDurableFunctionsWorkflowInstance> = {
                partitionKey: instance.instanceId,
                rowKey: "",
                Input: this.options.serializer.stringify(instance.args),
                CreatedTime: this.getDate(instance.start),
                Name: instance.instanceId,
                Version: "",
                RuntimeStatus: instance.end ? (error ? "Failed" : "Completed") : "Running",
                LastUpdatedTime: this.getDate(new Date()),
                TaskHubName: this.options.taskHubName,
                CustomStatus: instance.status,
                ExecutionId: instance.instanceId,
                Output: error ? this.options.serializer.stringify(serializeError(instance.error)) : this.options.serializer.stringify(instance.result),
                CompletedTime: this.getDate(instance.end),
            };

            if (isLarge(task.Input)) {
                let data = task.Input;
                let name = `${task.partitionKey}/Input.json.gz`;
                task.Input = `${this.largeMessages.url}/${name}`;

                blobs.push({
                    name,
                    data,
                });
            }

            if (isLarge(task.Output)) {
                let data = task.Output;
                let name = `${task.partitionKey}/Output.json.gz`;
                task.Output = `${this.largeMessages.url}/${name}`;

                blobs.push({
                    name,
                    data,
                });
            }

            let rowKey = 0;
            let rows = new Array<TableEntity<IDurableFunctionsWorkflowHistory>>();
            let eventId = 0;

            rows.push({
                partitionKey: instance.instanceId,
                rowKey: this.toHex(rowKey++, 16),
                Name: instance.instanceId,
                EventId: -1,
                _Timestamp: this.getDate(instance.start),
                EventType: "ExecutionStarted",
                ExecutionId: instance.instanceId,
            });

            for (let i = 0; i !== instance.activities.length; i++) {
                let activity = instance.activities[i];

                let row: IDurableFunctionsWorkflowHistory & { partitionKey: string, rowKey: string } = {
                    partitionKey: instance.instanceId,
                    rowKey: this.toHex(rowKey++, 16),
                    Name: activity.name,
                    EventId: eventId++,
                    _Timestamp: this.getDate(activity.start),
                    EventType: "TaskScheduled",
                    ExecutionId: instance.instanceId,
                    Input: this.options.serializer.stringify(activity.args),
                };
                if (isLargeHistory(row)) {
                    row.InputBlobName = `${row.partitionKey}/history-${row.rowKey}-${row.EventType}-Input.json.gz`;

                    blobs.push({
                        name: row.InputBlobName,
                        data: row.Input,
                    });

                    row.Input = "";
                }
                rows.push(row);

                if (activity.end) {
                    let error = Object.prototype.hasOwnProperty.call(activity, "error");

                    row = {
                        partitionKey: instance.instanceId,
                        rowKey: this.toHex(rowKey++, 16),
                        Name: null as any,
                        EventId: -1,
                        _Timestamp: this.getDate(activity.end),
                        EventType: error ? "TaskFailed" : "TaskCompleted",
                        TaskScheduledId: eventId - 1,
                        ExecutionId: instance.instanceId,
                        Result: error ? this.options.serializer.stringify(serializeError(activity.error)) : this.options.serializer.stringify(activity.result),
                    };
                    if (isLargeHistory(row)) {
                        row.ResultBlobName = `${row.partitionKey}/history-${row.rowKey}-${row.EventType}-Result.json.gz`;

                        blobs.push({
                            name: row.ResultBlobName,
                            data: row.Result,
                        });

                        row.Result = "";
                    }
                    rows.push(row);
                }
            }

            if (instance.end) {
                let row: IDurableFunctionsWorkflowHistory & { partitionKey: string, rowKey: string } = {
                    partitionKey: instance.instanceId,
                    rowKey: this.toHex(rowKey++, 16),
                    Name: instance.instanceId,
                    EventId: eventId++,
                    _Timestamp: this.getDate(instance.end),
                    EventType: "ExecutionCompleted",
                    ExecutionId: instance.instanceId,
                    Result: this.options.serializer.stringify(instance.result),
                };

                if (isLargeHistory(row)) {
                    row.ResultBlobName = `${row.partitionKey}/history-${row.rowKey}-${row.EventType}-Result.json.gz`;

                    blobs.push({
                        name: row.ResultBlobName,
                        data: row.Result,
                    });

                    row.Result = "";
                }
                rows.push(row);
            }

            // Make transaction chunks of 100 actions
            function chunk<T>(arr: Array<T>, chunkSize: number): Array<Array<T>> {
                let chunks = new Array<Array<T>>();
                for (let i = 0, len = arr.length; i < len; i += chunkSize) {
                    chunks.push(arr.slice(i, i + chunkSize));
                }
                return chunks;
            }

            let transactions = chunk(rows, 100).map(chunk => {
                const transaction = new TableTransaction();
                for (let i = 0; i !== chunk.length; i++) {
                    transaction.upsertEntity(chunk[i]);
                }
                return transaction;
            });

            // Blobs
            for (let i = 0; i !== blobs.length; i++) {
                let { name, data } = blobs[i];
                if (!data) {
                    continue;
                }
                let zipped = zlib.gzipSync(data);

                const blockBlobClient = this.largeMessages.getBlockBlobClient(name);
                await blockBlobClient.upload(zipped, Buffer.byteLength(zipped));
            }

            // Table rows
            if (transactions.length === 1) {
                let transaction = transactions[0];
                await Promise.all([this.instances.upsertEntity(task), this.history.submitTransaction(transaction.actions)]);
            } else {
                let transaction = transactions[0];
                await Promise.all([this.instances.upsertEntity(task), this.history.submitTransaction(transaction.actions)]);

                for (let i = 1; i !== transactions.length; i++) {
                    await this.history.submitTransaction(transactions[i].actions);
                }
            }
        });
    }

    public async getInstances(): Promise<WorkflowInstance[]> {
        return await this.mutex.runExclusive(async () => {
            await this.init();

            let instancesIterator = this.instances.listEntities<IDurableFunctionsWorkflowHistory>().byPage({ maxPageSize: 50 });

            const workflows = new Array<WorkflowInstance>();
            for await (const page of instancesIterator) {
                for await (const entity of page) {
                    const name = entity.Name;
                    if (!name) {
                        continue;
                    }
                    const instance = await this.getInstanceInternal(name);
                    if (instance) {
                        workflows.push(instance);
                    }
                }
            }

            return workflows;
        });
    }

    public async getInstanceHeaders(): Promise<Array<WorkflowInstanceHeader>> {
        return await this.mutex.runExclusive(async () => {
            await this.init();

            let instancesIterator = this.instances.listEntities<IDurableFunctionsWorkflowHistory>().byPage({ maxPageSize: 50 });

            const headers = new Array<WorkflowInstanceHeader>();
            for await (const page of instancesIterator) {
                for await (const entity of page) {
                    const id = entity.Name;
                    try {
                        const entity = await this.instances.getEntity<IDurableFunctionsWorkflowInstance>(id, "");

                        let header: WorkflowInstanceHeader = {
                            instanceId: id,
                            status: entity.CustomStatus as any,
                            start: entity.CreatedTime,
                            end: entity.CompletedTime,
                        };

                        if (header.end && entity.Output && entity.RuntimeStatus === "Failed") {
                            header.error = true;
                        }

                        headers.push(header);
                    } catch (e) {
                        if (typeof e === "object" && e && "statusCode" in e && e.statusCode === 404) {
                            continue;
                        }
                        throw e;
                    }
                }
            }

            return headers;
        });
    }

    public async removeInstance(id: string): Promise<void> {
        return await this.mutex.runExclusive(async () => {
            await this.init();

            let entity = await this.instances.getEntity<IDurableFunctionsWorkflowInstance>(id, "");

            let historyIterator = this.history.listEntities<IDurableFunctionsWorkflowHistory>({ queryOptions: { filter: `PartitionKey eq '${id}'` } }).byPage({ maxPageSize: 50 });
            for await (const page of historyIterator) {
                for await (const entity of page) {
                    if (entity.InputBlobName) {
                        let input = this.largeMessages.getBlockBlobClient(entity.InputBlobName);
                        await input.deleteIfExists();
                    }
                    if (entity.ResultBlobName) {
                        let result = this.largeMessages.getBlockBlobClient(entity.ResultBlobName);
                        await result.deleteIfExists();
                    }
                    if (!entity.rowKey) {
                        throw new Error("Expected row key to be set.");
                    }
                    await this.history.deleteEntity(id, entity.rowKey);
                }
            }

            if (entity.Input && entity.Input.indexOf("http://") === 0) {
                let input = this.largeMessages.getBlockBlobClient(`${id}/Input.json.gz`);
                await input.deleteIfExists();
            }

            if (entity.Output && entity.Output.indexOf("http://") === 0) {
                let output = this.largeMessages.getBlockBlobClient(`${id}/Output.json.gz`);
                await output.deleteIfExists();
            }

            await this.instances.deleteEntity(id, "");
        });
    }
}