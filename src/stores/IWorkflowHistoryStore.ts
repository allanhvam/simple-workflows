export type WorkflowInstanceHeader = {
    instanceId: string;
    status?: "timeout";
    start: Date;
    end?: Date;
    error?: boolean;
};

export type WorkflowInstance = Omit<WorkflowInstanceHeader, "error"> & {
    args: Array<unknown>;
    result?: unknown;
    error?: unknown;

    activities: Array<WorkflowActivity>;
};

export type WorkflowActivity = {
    name: string;
    args: Array<unknown>;
    start: Date;
    end?: Date;
    result?: unknown;
    error?: unknown;
};

export type GetInstancesOptions = {
    continuationToken?: string;
    pageSize?: number;
    filter?: {
        from?: Date;
        to?: Date;
    };
};

export type GetInstancesResult = Promise<{
    instances: Array<WorkflowInstanceHeader>;
    continuationToken?: string;
}>;

export interface IWorkflowHistoryStore {
    name: string;

    getInstance: (id: string) => Promise<WorkflowInstance | undefined>;
    setInstance: (instance: WorkflowInstance) => Promise<void>;
    removeInstance: (id: string) => Promise<void>;

    getInstances: (options?: GetInstancesOptions) => GetInstancesResult;

    equal: (val1: any, val2: any) => boolean;
}
