export type WorkflowInstanceHeader = {
    instanceId: string;
    status?: "timeout";
    start: Date;
    end?: Date;
    error?: boolean;
}

export type WorkflowInstance = Omit<WorkflowInstanceHeader, "error"> & {
    args: Array<unknown>;
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
    getInstance: (id: string) => Promise<WorkflowInstance | undefined>;
    setInstance: (instance: WorkflowInstance) => Promise<void>;
    getInstances: () => Promise<Array<WorkflowInstance>>;
    getInstanceHeaders: () => Promise<Array<WorkflowInstanceHeader>>;
    removeInstance: (id: string) => Promise<void>;
    equal(val1: any, val2: any): boolean;
}