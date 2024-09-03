import { type IWorkflowHistoryStore } from "../stores/IWorkflowHistoryStore.js";

export declare type WorkflowFunctionReturnType = Promise<any>;

export declare type WorkflowFunction = (...args: any[]) => WorkflowFunctionReturnType;

export declare type WorkflowResultType<W extends WorkflowFunction> = ReturnType<W> extends Promise<infer R> ? R : never;

export interface BaseWorkflowHandle<T extends WorkflowFunction> {
    result: () => Promise<WorkflowResultType<T>>
    store?: IWorkflowHistoryStore
    readonly workflowId: string
}
