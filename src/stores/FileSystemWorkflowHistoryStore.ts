import { IWorkflowHistoryStore, IWorkflowInstance } from "./IWorkflowHistoryStore";
import { resolve } from "path";
import { cwd } from "process";
import * as fs from "fs";
import { deserializeError, serializeError } from "../serialize-error";

export class FileSystemWorkflowHistoryStore implements IWorkflowHistoryStore {
    public workflowHistory: Array<IWorkflowInstance> = [];

    public constructor(private options?: { path?: string }) {
        if (!this.options) {
            this.options = {};
        }
        if (!this.options.path) {
            this.options.path = resolve(cwd(), "./workflow-history/");
        }
        if (!fs.existsSync(this.options.path)) {
            throw new Error(`simple-workflows: FileSystemWorkflowHistoryStore path ${this.options.path} does not exist.`);
        }
    }

    public async getInstance(id: string): Promise<IWorkflowInstance> {
        let filePath = resolve(this.options.path, `${id}.json`);
        if (!fs.existsSync(filePath)) {
            return Promise.resolve(undefined);
        }

        let contents = fs.readFileSync(filePath, { encoding: "utf-8" });
        let instance: IWorkflowInstance = JSON.parse(contents);
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
                    activity.error = deserializeError(instance.error);
                }
            });
        }

        return instance;
    }

    public async setInstance(instance: IWorkflowInstance): Promise<void> {
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
            fs.writeFileSync(filePath, JSON.stringify(instance, (k, v) => v === undefined ? null : v), { encoding: "utf-8" });
        } else {
            Object.assign(current, instance);
            fs.writeFileSync(filePath, JSON.stringify(current, (k, v) => v === undefined ? null : v), { encoding: "utf-8" });
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
}