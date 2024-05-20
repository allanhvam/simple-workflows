import { isDeepStrictEqual } from "node:util";
import { type IWorkflowHistoryStore, type WorkflowInstance, type WorkflowInstanceHeader } from "./IWorkflowHistoryStore";

export class MemoryWorkflowHistoryStore implements IWorkflowHistoryStore {
    public workflowHistory: Array<WorkflowInstance> = [];

    public async getInstance(id: string): Promise<WorkflowInstance | undefined> {
        const workflowInstance = this.workflowHistory.find(w => w.instanceId === id);

        return await Promise.resolve(workflowInstance);
    }

    public async setInstance(instance: WorkflowInstance): Promise<void> {
        const current = await this.getInstance(instance.instanceId);
        if (!current) {
            this.workflowHistory.push(instance);
        } else {
            Object.assign(current, instance);
        }
        return await Promise.resolve();
    }

    public async getInstances(): Promise<WorkflowInstance[]> {
        return await Promise.resolve(this.workflowHistory);
    }

    public async getInstanceHeaders(): Promise<Array<WorkflowInstanceHeader>> {
        return await Promise.resolve(this.workflowHistory.map(instance => {
            return {
                instanceId: instance.instanceId,
                status: instance.status,
                start: instance.start,
                end: instance.end,
                error: !!instance.error,
            };
        }));
    }

    public async removeInstance(id: string): Promise<void> {
        const index = this.workflowHistory.findIndex(i => i.instanceId === id);
        if (index > -1) {
            this.workflowHistory.splice(index, 1);
        }
    }

    public equal = isDeepStrictEqual;
}
