import { IWorkflowHistoryStore, WorkflowInstance } from "./IWorkflowHistoryStore";
import { resolve } from "path";
import { cwd } from "process";
import * as fs from "fs";
import { deserializeError, serializeError } from "../serialize-error";
import { ISerializer } from "../ISerializer";
import { DefaultSerializer } from "../DefaultSerializer";
import { parse as pathParse } from "path";
import { isDeepStrictEqual } from "util";

export class FileSystemWorkflowHistoryStore implements IWorkflowHistoryStore {
    public workflowHistory: Array<WorkflowInstance> = [];

    public constructor(private options?: { path?: string, serializer?: ISerializer }) {
        if (!this.options) {
            this.options = {};
        }
        if (!this.options.path) {
            this.options.path = resolve(cwd(), "./workflow-history/");
        }
        if (!this.options.serializer) {
            this.options.serializer = new DefaultSerializer();
        }
        if (!fs.existsSync(this.options.path)) {
            throw new Error(`simple-workflows: FileSystemWorkflowHistoryStore path ${this.options.path} does not exist.`);
        }
    }

    public equal = (val1: any, val2: any): boolean => {
        return (this.options.serializer.equal || isDeepStrictEqual)(val1, val2);
    }

    public async getInstance(id: string): Promise<WorkflowInstance> {
        let filePath = resolve(this.options.path, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            return Promise.resolve(undefined);
        }

        let contents = fs.readFileSync(filePath, { encoding: "utf-8" });
        let instance: WorkflowInstance = this.options.serializer.parse(contents);
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
    }

    public async setInstance(instance: WorkflowInstance): Promise<void> {
        let current = await this.getInstance(instance.instanceId);
        let filePath = resolve(this.options.path, `${instance.instanceId}.json`);

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
            fs.writeFileSync(filePath, this.options.serializer.stringify(instance), { encoding: "utf-8" });
        } else {
            Object.assign(current, instance);
            fs.writeFileSync(filePath, this.options.serializer.stringify(current), { encoding: "utf-8" });
        }
        return Promise.resolve();
    }

    public async clear(): Promise<void> {
        let path = this.options.path;
        let files = fs.readdirSync(path);
        files = files.filter(file => file.indexOf(".json") > 0);
        files.forEach(file => {
            let filePath = resolve(this.options.path, file);
            fs.unlinkSync(filePath);
        });
    }

    public async getInstances(): Promise<Array<WorkflowInstance>> {
        let files = fs.readdirSync(this.options.path);
        files = files.filter(file => fs.lstatSync(file).isFile());

        const instanceIds = files.map(file => pathParse(file).name);

        const instances = new Array<WorkflowInstance>();
        for (let i = 0; i !== instanceIds.length; i++) {
            const id = instanceIds[i];
            const instance = await this.getInstance(id);
            instances.push(instance);
        }
        return instances;
    }

    public async removeInstance(id: string): Promise<void> {
        let filePath = resolve(this.options.path, `${id}.json`);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}