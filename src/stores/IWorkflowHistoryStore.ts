export type WorkflowInstance = {
    instanceId: string;
    status?: "timeout";
    args: Array<unknown>;
    start: Date;
    end?: Date;
    result?: unknown;
    error?: unknown;

    activities: Array<WorkflowActivityInstance>;
}

export type WorkflowActivityInstance = {
    name: string;
    args: Array<unknown>;
    start: Date;
    end?: Date;
    result?: unknown;
    error?: unknown;
}

export interface IWorkflowHistoryStore {
    getInstance: (id: string) => Promise<WorkflowInstance>;
    setInstance: (instance: WorkflowInstance) => Promise<void>;
    getInstances: () => Promise<Array<WorkflowInstance>>;
    removeInstance: (id: string) => Promise<void>;
    equal(val1: any, val2: any): boolean;
}