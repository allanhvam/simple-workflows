import { type msStringValue } from "../ms.js";
import { type IWorkflowHistoryStore } from "../stores/IWorkflowHistoryStore.js";
import { type WorkflowHandle, type WorkflowFunction } from "./WorkflowFunction.js";

export declare type WithWorkflowArgs<W extends WorkflowFunction, T> = T & (Parameters<W> extends [any, ...any[]] ? {
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
    workflowId?: string;
    /**
     * @format Formatted string (ms, s, m and h) or number of milliseconds
     */
    workflowExecutionTimeout?: msStringValue | number;
    /**
     * Store for the workflow instance, overwrites the global instance (if set)
     */
    store?: IWorkflowHistoryStore;
};

export declare type WorkflowStartOptions<T extends WorkflowFunction = WorkflowFunction> = WithWorkflowArgs<T, WorkflowOptions>;

export interface IWorker {
    start: <T extends WorkflowFunction>(workflow: T, options?: WorkflowStartOptions<T>) => Promise<WorkflowHandle<T>>;
    store: IWorkflowHistoryStore;
    log?: (s: string) => void;
}
