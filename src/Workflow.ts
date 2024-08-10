import { type IWorkflowHistoryStore } from "./stores/IWorkflowHistoryStore.js";

export declare type WorkflowReturnType = Promise<any>;

export declare type Workflow = (...args: any[]) => WorkflowReturnType;

export declare type WorkflowResultType<W extends Workflow> = ReturnType<W> extends Promise<infer R> ? R : never;

export interface BaseWorkflowHandle<T extends Workflow> {
    result: () => Promise<WorkflowResultType<T>>
    store?: IWorkflowHistoryStore
    readonly workflowId: string
}
