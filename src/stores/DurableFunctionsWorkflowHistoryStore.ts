import type { GetInstancesOptions, GetInstancesResult, WorkflowActivity, WorkflowInstance, WorkflowInstanceHeader } from "./IWorkflowHistoryStore.js";
import { type GetTableEntityResponse, TableClient, type TableEntity, type TableEntityResult, TableServiceClient, TableTransaction } from "@azure/data-tables";
import { deserializeError, serializeError } from "../serialization/index.js";
import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import zlib from "zlib";
import { Mutex } from "async-mutex";
import { type ISerializer } from "../serialization/ISerializer.js";
import { SerializedWorkflowHistoryStore } from "./SerializedWorkflowHistoryStore.js";
import { type TokenCredential } from "@azure/core-auth";

interface IDurableFunctionsWorkflowHistory {
    Name: string
    Result?: string
    ResultBlobName?: string
    EventId: number
    _Timestamp: Date
    EventType: "TaskScheduled" | "TaskCompleted" | "TaskFailed" | "ExecutionStarted" | "ExecutionCompleted"
    ExecutionId: string
    TaskScheduledId?: number
    Input?: string
    InputBlobName?: string
}

// https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-instance-management?tabs=csharp#query-instances
interface IDurableFunctionsWorkflowInstance {
    Input: string
    CreatedTime: Date
    Name: string
    Version: string
    RuntimeStatus: "Pending" | "Running" | "Completed" | "ContinuedAsNew" | "Failed" | "Terminated"
    LastUpdatedTime: Date
    TaskHubName: string
    CustomStatus?: string
    ExecutionId: string
    Output: string
    CompletedTime?: Date
}

export class DurableFunctionsWorkflowHistoryStore extends SerializedWorkflowHistoryStore {
    public readonly name = "durable-functions";

    private initialized?: boolean;
    private readonly history: TableClient;
    private readonly instances: TableClient;
    private readonly largeMessages: ContainerClient;
    private readonly mutex = new Mutex();
    public readonly options: {
        connectionString?: string,

        tableUrl?: string;
        blobUrl?: string;
        credential?: TokenCredential;

        taskHubName: string,
    };

    constructor(options: ({ connectionString: string } | { tableUrl: string, blobUrl: string, credential: TokenCredential }) & { taskHubName?: string, serializer?: ISerializer }) {
        super(options?.serializer);
        this.options = {
            taskHubName: options.taskHubName ?? "Workflow",
        };

        if ("connectionString" in options) {
            this.options.connectionString = options.connectionString;

            const { connectionString, taskHubName } = this.options;
            this.history = TableClient.fromConnectionString(connectionString, `${taskHubName}History`);
            this.instances = TableClient.fromConnectionString(connectionString, `${taskHubName}Instances`);

            const blobServicesClient = BlobServiceClient.fromConnectionString(connectionString);
            this.largeMessages = blobServicesClient.getContainerClient(`${taskHubName}-largemessages`.toLowerCase());

            return;
        }

        this.options.tableUrl = options.tableUrl;
        this.options.blobUrl = options.blobUrl;
        this.options.credential = options.credential;

        const { tableUrl, blobUrl, credential, taskHubName } = this.options;
        this.history = new TableClient(tableUrl, `${taskHubName}History`, credential);
        this.instances = new TableClient(tableUrl, `${taskHubName}Instances`, credential);

        const blobServicesClient = new BlobServiceClient(blobUrl, credential);
        this.largeMessages = blobServicesClient.getContainerClient(`${taskHubName}-largemessages`.toLowerCase());
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

        const time = date.getTime();
        if (time % 10 === 0) {
            return new Date(time + 1);
        }
        return date;
    }

    public async clear(): Promise<void> {
        if (this.options.connectionString) {
            const tableServiceClient = TableServiceClient.fromConnectionString(this.options.connectionString);
            await tableServiceClient.deleteTable(`${this.options.taskHubName}History`);
            await tableServiceClient.deleteTable(`${this.options.taskHubName}Instances`);

            const blobServicesClient = BlobServiceClient.fromConnectionString(this.options.connectionString);
            const largeMessages = blobServicesClient.getContainerClient(`${this.options.taskHubName}-largemessages`.toLowerCase());
            await largeMessages.deleteIfExists();
        }

        if (this.options.tableUrl && this.options.blobUrl && this.options.credential) {
            const tableServiceClient = new TableServiceClient(this.options.tableUrl, this.options.credential);
            await tableServiceClient.deleteTable(`${this.options.taskHubName}History`);
            await tableServiceClient.deleteTable(`${this.options.taskHubName}Instances`);

            const blobServicesClient = new BlobServiceClient(this.options.blobUrl, this.options.credential);
            const largeMessages = blobServicesClient.getContainerClient(`${this.options.taskHubName}-largemessages`.toLowerCase());
            await largeMessages.deleteIfExists();
        }

        this.initialized = false;
        await this.init();
    }

    public getInstance = async (id: string): Promise<WorkflowInstance | undefined> => {
        return await this.mutex.runExclusive(async () => {
            await this.init();

            return await this.getInstanceInternal(id);
        });
    };

    private async getInstanceInternal(id: string): Promise<WorkflowInstance | undefined> {
        async function streamToBuffer(readableStream: NodeJS.ReadableStream): Promise<Buffer> {
            return await new Promise((resolve, reject) => {
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

        const getBlob = async (blobName: string): Promise<any | undefined> => {
            const blockBlobClient = this.largeMessages?.getBlockBlobClient(blobName);

            const downloadBlockBlobResponse = await blockBlobClient?.download();
            if (!downloadBlockBlobResponse.readableStreamBody) {
                return undefined;
            }
            const buffer = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);

            const unzipped = zlib.unzipSync(buffer).toString();
            return this.serializer.parse(unzipped);
        };

        let entity: GetTableEntityResponse<TableEntityResult<IDurableFunctionsWorkflowInstance>> | undefined;
        try {
            entity = await this.instances.getEntity<IDurableFunctionsWorkflowInstance>(id, "");
        } catch (e: unknown) {
            if (typeof e === "object" && e && "statusCode" in e && e.statusCode === 404) {
                return undefined;
            }
            throw e;
        }

        const instance: WorkflowInstance = {
            instanceId: id,
            status: entity.CustomStatus as any,
            args: [],
            start: entity.CreatedTime,
            end: entity.CompletedTime,
            activities: new Array<WorkflowActivity>(),
        };

        if (entity.Input) {
            if (entity.Input.indexOf("http://") === 0 || entity.Input.indexOf("https://") === 0) {
                instance.args = await getBlob(`${id}/Input.json.gz`);
            } else {
                instance.args = this.serializer.parse(entity.Input);
            }
        }

        const filter = `PartitionKey eq '${id}'`;
        const historyIterator = this.history.listEntities<IDurableFunctionsWorkflowHistory>({ queryOptions: { filter } }).byPage({ maxPageSize: 50 });

        for await (const page of historyIterator) {
            for await (const entity of page) {
                if (entity.EventId > -1 && entity.EventType === "TaskScheduled") {
                    let args: Array<any>;
                    if (entity.InputBlobName) {
                        args = await getBlob(entity.InputBlobName);
                    } else {
                        if (entity.Input) {
                            args = this.serializer.parse(entity.Input);
                        } else {
                            args = [];
                        }
                    }

                    instance.activities.push(
                        {
                            args,
                            name: entity.Name || "",
                            start: entity._Timestamp,
                        },
                    );
                }

                let result: any;
                if (entity.ResultBlobName) {
                    result = await getBlob(entity.ResultBlobName);
                } else if (entity.Result) {
                    result = this.serializer.parse(entity.Result);
                }

                if (entity.EventType === "TaskCompleted") {
                    const taskScheduledId = entity.TaskScheduledId;
                    if (typeof taskScheduledId === "undefined") {
                        throw new Error("Expected TaskScheduledId to be set");
                    }
                    const activity = instance.activities[taskScheduledId];
                    activity.end = entity._Timestamp;
                    activity.result = result;
                } else if (entity.EventType === "TaskFailed") {
                    const taskScheduledId = entity.TaskScheduledId;
                    if (typeof taskScheduledId === "undefined") {
                        throw new Error("Expected TaskScheduledId to be set");
                    }
                    const activity = instance.activities[taskScheduledId];
                    activity.end = entity._Timestamp;
                    activity.error = result && deserializeError(result);
                }
            }
        }

        if (instance.end) {
            let output: any;
            if (entity.Output) {
                if (entity.Output.indexOf("http://") === 0 || entity.Output.indexOf("https://") === 0) {
                    output = await getBlob(`${id}/Output.json.gz`);
                } else {
                    output = this.serializer.parse(entity.Output);
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

    public setInstance = async (instance: WorkflowInstance): Promise<void> => {
        await this.mutex.runExclusive(async () => {
            const isLarge = (data: string | undefined): boolean => {
                if (!data) {
                    return false;
                }
                const sixtyKb = 60 * 128;
                if (data && Buffer.byteLength(data) >= sixtyKb) {
                    return true;
                }
                return false;
            };
            const isLargeHistory = (row: { Input?: string, Result?: string }): boolean => {
                if (isLarge(row.Input)) {
                    return true;
                }
                if (isLarge(row.Result)) {
                    return true;
                }
                return false;
            };

            await this.init();

            const blobs = new Array<{ name: string, data?: string }>();
            const error = Object.hasOwn(instance, "error");
            const task: TableEntity<IDurableFunctionsWorkflowInstance> = {
                partitionKey: instance.instanceId,
                rowKey: "",
                Input: this.serializer.stringify(instance.args),
                CreatedTime: this.getDate(instance.start),
                Name: instance.instanceId,
                Version: "",
                RuntimeStatus: instance.end ? (error ? "Failed" : "Completed") : "Running",
                LastUpdatedTime: this.getDate(new Date()),
                TaskHubName: this.options.taskHubName,
                CustomStatus: instance.status,
                ExecutionId: instance.instanceId,
                Output: error ? this.serializer.stringify(serializeError(instance.error)) : this.serializer.stringify(instance.result),
                CompletedTime: this.getDate(instance.end),
            };

            if (isLarge(task.Input)) {
                const data = task.Input;
                const name = `${task.partitionKey}/Input.json.gz`;
                task.Input = `${this.largeMessages.url}/${name}`;

                blobs.push({
                    name,
                    data,
                });
            }

            if (isLarge(task.Output)) {
                const data = task.Output;
                const name = `${task.partitionKey}/Output.json.gz`;
                task.Output = `${this.largeMessages.url}/${name}`;

                blobs.push({
                    name,
                    data,
                });
            }

            let rowKey = 0;
            const rows = new Array<TableEntity<IDurableFunctionsWorkflowHistory>>();
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
                const activity = instance.activities[i];

                let row: IDurableFunctionsWorkflowHistory & { partitionKey: string, rowKey: string } = {
                    partitionKey: instance.instanceId,
                    rowKey: this.toHex(rowKey++, 16),
                    Name: activity.name,
                    EventId: eventId++,
                    _Timestamp: this.getDate(activity.start),
                    EventType: "TaskScheduled",
                    ExecutionId: instance.instanceId,
                    Input: this.serializer.stringify(activity.args),
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
                    const error = Object.hasOwn(activity, "error");

                    row = {
                        partitionKey: instance.instanceId,
                        rowKey: this.toHex(rowKey++, 16),
                        Name: null as any,
                        EventId: -1,
                        _Timestamp: this.getDate(activity.end),
                        EventType: error ? "TaskFailed" : "TaskCompleted",
                        TaskScheduledId: eventId - 1,
                        ExecutionId: instance.instanceId,
                        Result: error ? this.serializer.stringify(serializeError(activity.error)) : this.serializer.stringify(activity.result),
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
                const row: IDurableFunctionsWorkflowHistory & { partitionKey: string, rowKey: string } = {
                    partitionKey: instance.instanceId,
                    rowKey: this.toHex(rowKey++, 16),
                    Name: instance.instanceId,
                    EventId: eventId++,
                    _Timestamp: this.getDate(instance.end),
                    EventType: "ExecutionCompleted",
                    ExecutionId: instance.instanceId,
                    Result: this.serializer.stringify(instance.result),
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
                const chunks = new Array<Array<T>>();
                for (let i = 0, len = arr.length; i < len; i += chunkSize) {
                    chunks.push(arr.slice(i, i + chunkSize));
                }
                return chunks;
            }

            const transactions = chunk(rows, 100).map(chunk => {
                const transaction = new TableTransaction();
                for (let i = 0; i !== chunk.length; i++) {
                    transaction.upsertEntity(chunk[i]);
                }
                return transaction;
            });

            // Blobs
            for (let i = 0; i !== blobs.length; i++) {
                const { name, data } = blobs[i];
                if (!data) {
                    continue;
                }
                const zipped = zlib.gzipSync(data);

                const blockBlobClient = this.largeMessages.getBlockBlobClient(name);
                await blockBlobClient.upload(zipped, Buffer.byteLength(zipped));
            }

            // Table rows
            if (transactions.length === 1) {
                const transaction = transactions[0];
                await Promise.all([this.instances.upsertEntity(task), this.history.submitTransaction(transaction.actions)]);
            } else {
                const transaction = transactions[0];
                await Promise.all([this.instances.upsertEntity(task), this.history.submitTransaction(transaction.actions)]);

                for (let i = 1; i !== transactions.length; i++) {
                    await this.history.submitTransaction(transactions[i].actions);
                }
            }
        });
    };

    public getInstances = async (options?: GetInstancesOptions): GetInstancesResult => {
        return await this.mutex.runExclusive(async () => {
            await this.init();

            const queryFilters = new Array<string>();
            if (options?.filter?.from) {
                queryFilters.push(`CreatedTime ge datetime'${options.filter.from.toISOString()}'`);
            }

            if (options?.filter?.to) {
                queryFilters.push(`CreatedTime lt datetime'${options.filter.to.toISOString()}'`);
            }

            const instancesIterator = this.instances.listEntities<IDurableFunctionsWorkflowInstance>(
                {
                    queryOptions: {
                        filter: queryFilters.join(" and "),
                        select: [
                            "Name",
                            "CustomStatus",
                            "CreatedTime",
                            "CompletedTime",
                            "RuntimeStatus",
                        ],
                    },
                },
            ).byPage({
                maxPageSize: options?.pageSize ?? 50, // max 1000
                continuationToken: options?.continuationToken,
            });

            const instances = new Array<WorkflowInstanceHeader>();
            let continuationToken: undefined | string;

            for await (const page of instancesIterator) {
                continuationToken = page.continuationToken;
                for await (const instance of page) {
                    const header: WorkflowInstanceHeader = {
                        instanceId: instance.Name,
                        status: instance.CustomStatus === "timeout" ? "timeout" : undefined,
                        start: instance.CreatedTime,
                        end: instance.CompletedTime,
                        error: instance.RuntimeStatus === "Failed",
                    };

                    instances.push(header);
                }
                break;
            }
            return {
                instances,
                continuationToken,
            };
        });
    };

    public removeInstance = async (id: string): Promise<void> => {
        return await this.mutex.runExclusive(async () => {
            await this.init();

            const entity = await this.instances.getEntity<IDurableFunctionsWorkflowInstance>(id, "");

            const historyIterator = this.history.listEntities<IDurableFunctionsWorkflowHistory>({ queryOptions: { filter: `PartitionKey eq '${id}'` } }).byPage({ maxPageSize: 50 });
            for await (const page of historyIterator) {
                for await (const entity of page) {
                    if (entity.InputBlobName) {
                        const input = this.largeMessages.getBlockBlobClient(entity.InputBlobName);
                        await input.deleteIfExists();
                    }
                    if (entity.ResultBlobName) {
                        const result = this.largeMessages.getBlockBlobClient(entity.ResultBlobName);
                        await result.deleteIfExists();
                    }
                    if (!entity.rowKey) {
                        throw new Error("Expected row key to be set.");
                    }
                    await this.history.deleteEntity(id, entity.rowKey);
                }
            }

            if (entity.Input && (entity.Input.indexOf("http://") === 0 || entity.Input.indexOf("https://") === 0)) {
                const input = this.largeMessages.getBlockBlobClient(`${id}/Input.json.gz`);
                await input.deleteIfExists();
            }

            if (entity.Output && (entity.Output.indexOf("http://") === 0 || entity.Output.indexOf("https://") === 0)) {
                const output = this.largeMessages.getBlockBlobClient(`${id}/Output.json.gz`);
                await output.deleteIfExists();
            }

            await this.instances.deleteEntity(id, "");
        });
    };
}
