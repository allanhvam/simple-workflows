import { IWorkflowHistoryStore, WorkflowInstance } from "./IWorkflowHistoryStore";

export class MemoryWorkflowHistoryStore implements IWorkflowHistoryStore {
    public workflowHistory: Array<WorkflowInstance> = [];

    public async getInstance(id: string): Promise<WorkflowInstance> {
        let workflowInstance = this.workflowHistory.find(w => w.instanceId === id);

        return Promise.resolve(workflowInstance);
    }

    public async setInstance(instance: WorkflowInstance): Promise<void> {
        let current = await this.getInstance(instance.instanceId);
        if (!current) {
            this.workflowHistory.push(instance);
        } else {
            Object.assign(current, instance);
        }
        return Promise.resolve();
    }

    public async getInstances(): Promise<WorkflowInstance[]> {
        return Promise.resolve(this.workflowHistory);
    }

    public async removeInstance(id: string): Promise<void> {
        const index = this.workflowHistory.findIndex(i => i.instanceId === id);
        if (index > -1) {
            this.workflowHistory.splice(index, 1);
        }
    }
}