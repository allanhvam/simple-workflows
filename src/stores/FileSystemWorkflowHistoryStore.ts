import type { GetInstancesOptions, GetInstancesResult, WorkflowInstance } from "./IWorkflowHistoryStore.js";
import { resolve, parse as pathParse } from "path";
import { cwd } from "process";
import * as fs from "node:fs";
import { deserializeError, serializeError } from "../serialization/index.js";
import { type ISerializer } from "../serialization/ISerializer.js";
import { SerializedWorkflowHistoryStore } from "./SerializedWorkflowHistoryStore.js";

export class FileSystemWorkflowHistoryStore extends SerializedWorkflowHistoryStore {
    public readonly name = "file-system";

    public workflowHistory: Array<WorkflowInstance> = [];
    private readonly options: { path: string };

    public constructor(options?: { path?: string, serializer?: ISerializer }) {
        super(options?.serializer);

        this.options = {
            path: options?.path ?? resolve(cwd(), "./workflow-history/"),
        };

        if (!fs.existsSync(this.options.path)) {
            throw new Error(`simple-workflows: FileSystemWorkflowHistoryStore path ${this.options.path} does not exist.`);
        }
    }

    public getInstance = async (id: string): Promise<WorkflowInstance | undefined> => {
        const filePath = resolve(this.options.path, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            return await Promise.resolve(undefined);
        }

        const contents = fs.readFileSync(filePath, { encoding: "utf-8" });
        const instance: WorkflowInstance = this.serializer.parse(contents);
        // Deserialize dates and errors
        if (instance.start) {
            instance.start = new Date(instance.start);
        }
        if (instance.end) {
            instance.end = new Date(instance.end);
        }
        if (instance.error) {
            instance.error = deserializeError(instance.error);
        }
        if (instance.activities) {
            instance.activities.forEach(activity => {
                if (activity.start) {
                    activity.start = new Date(activity.start);
                }
                if (activity.end) {
                    activity.end = new Date(activity.end);
                }
                if (activity.error) {
                    activity.error = deserializeError(activity.error);
                }
            });
        }

        return instance;
    };

    public setInstance = async (instance: WorkflowInstance): Promise<void> => {
        const current = await this.getInstance(instance.instanceId);
        const filePath = resolve(this.options.path, `${instance.instanceId}.json`);

        // Serialize errors
        if (instance.error) {
            instance.error = serializeError(instance.error);
        }
        if (instance.activities) {
            instance.activities.forEach(activity => {
                if (activity.error) {
                    activity.error = serializeError(activity.error);
                }
            });
        }

        if (!current) {
            fs.writeFileSync(filePath, this.serializer.stringify(instance), { encoding: "utf-8" });
        } else {
            Object.assign(current, instance);
            fs.writeFileSync(filePath, this.serializer.stringify(current), { encoding: "utf-8" });
        }
        return await Promise.resolve();
    };

    public async clear(): Promise<void> {
        const path = this.options.path;
        let files = fs.readdirSync(path);
        files = files.filter(file => file.indexOf(".json") > 0);
        files.forEach(file => {
            const filePath = resolve(this.options.path, file);
            fs.unlinkSync(filePath);
        });
    }

    public getInstances = async (options?: GetInstancesOptions): GetInstancesResult => {
        let files = fs.readdirSync(this.options.path);
        files = files.filter(file => fs.lstatSync(resolve(this.options.path, file)).isFile());

        const instanceIds = files.map(file => pathParse(file).name);

        const instances = new Array<WorkflowInstance>();
        for (let i = 0; i !== instanceIds.length; i++) {
            const id = instanceIds[i];
            const instance = await this.getInstance(id);
            if (instance) {
                instances.push(instance);
            }
        }

        return await this.getWorkflowInstanceHeaders(instances, options);
    };

    public removeInstance = async (id: string): Promise<void> => {
        const filePath = resolve(this.options.path, `${id}.json`);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    };
}
