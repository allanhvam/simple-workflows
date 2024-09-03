import { isDeepStrictEqual } from "node:util";
import type { GetInstancesOptions, GetInstancesResult, WorkflowInstance } from "./IWorkflowHistoryStore.js";
import { WorkflowHistoryStore } from "./WorkflowHistoryStore.js";

export class MemoryWorkflowHistoryStore extends WorkflowHistoryStore {
    public readonly name = "memory";
    
    public workflowHistory: Array<WorkflowInstance> = [];

    public getInstance = async (id: string): Promise<WorkflowInstance | undefined> => {
        const workflowInstance = this.workflowHistory.find(w => w.instanceId === id);

        return await Promise.resolve(workflowInstance);
    };

    public setInstance = async (instance: WorkflowInstance): Promise<void> => {
        const current = await this.getInstance(instance.instanceId);
        if (!current) {
            this.workflowHistory.push(instance);
        } else {
            Object.assign(current, instance);
        }
        return await Promise.resolve();
    };

    public getInstances = async (options?: GetInstancesOptions): GetInstancesResult => {
        return await this.getWorkflowInstanceHeaders(this.workflowHistory, options);
    };

    public removeInstance = async (id: string): Promise<void> => {
        const index = this.workflowHistory.findIndex(i => i.instanceId === id);
        if (index > -1) {
            this.workflowHistory.splice(index, 1);
        }
        return await Promise.resolve();
    };

    public equal = isDeepStrictEqual;
}
