export interface IWorkflowInstance {
    instanceId: string;
    status?: "timeout";
    args: Array<any>;
    start: Date;
    end?: Date;
    result?: any;
    error?: any;

    activities: Array<IWorkflowActivityInstance>;
}

export interface IWorkflowActivityInstance {
    name: string;
    args: Array<any>;
    start: Date;
    end?: Date;
    result?: any;
    error?: any;
}

export interface IWorkflowHistoryStore {
    getInstance: (id: string) => Promise<IWorkflowInstance>;
    setInstance: (instance: IWorkflowInstance) => Promise<void>;
}