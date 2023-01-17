import { ISerializer } from "./ISerializer";
import { IWorkflowHistoryStore } from "./stores/IWorkflowHistoryStore";
import { BaseWorkflowHandle, Workflow } from "./Workflow";

export declare type WithWorkflowArgs<W extends Workflow, T> = T & (Parameters<W> extends [any, ...any[]] ? {
    /**
     * Arguments to pass to the Workflow
     */
    args: Parameters<W>;
} : {
    /**
     * Arguments to pass to the Workflow
     */
    args?: Parameters<W>;
});

export declare type WorkflowOptions = {
    workflowId?: string,
    /**
     * @format {@link https://www.npmjs.com/package/ms | ms} formatted string or number of milliseconds
     */
    workflowExecutionTimeout?: string | number;
    /**
     * Store for the workflow instance, overwrites the global instance (if set)
     */
    store?: IWorkflowHistoryStore;
    /**
     * Serializer for the workflow instance, overwrites the global instance (if set)
     */
    serializer?: ISerializer;
}

export declare type WorkflowStartOptions<T extends Workflow = Workflow> = WithWorkflowArgs<T, WorkflowOptions>;


export interface IWorker {
    start<T extends Workflow>(workflow: T, options?: WorkflowStartOptions<T>): Promise<BaseWorkflowHandle<T>>;
    store: IWorkflowHistoryStore;
    serializer: ISerializer;
    log?: (s: string) => void;
}