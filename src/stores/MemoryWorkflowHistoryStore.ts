import { IWorkflowHistoryStore, IWorkflowInstance } from "./IWorkflowHistoryStore";

export class MemoryWorkflowHistoryStore implements IWorkflowHistoryStore {
    public workflowHistory: Array<IWorkflowInstance> = [];

    public async getInstance(id: string): Promise<IWorkflowInstance> {
        let workflowInstance = this.workflowHistory.find(w => w.instanceId === id);

        return Promise.resolve(workflowInstance);
    }

    public async setInstance(instance: IWorkflowInstance): Promise<void> {
        let current = await this.getInstance(instance.instanceId);
        if (!current) {
            this.workflowHistory.push(instance);
        } else {
            Object.assign(current, instance);
        }
        return Promise.resolve();
    }

    public async getInstances(): Promise<IWorkflowInstance[]> {
        return Promise.resolve(this.workflowHistory);
    }

    public async removeInstance(id: string): Promise<void> {
        const index = this.workflowHistory.findIndex(i => i.instanceId === id);
        if (index > -1) {
            this.workflowHistory.splice(index, 1);
        }
    }
}