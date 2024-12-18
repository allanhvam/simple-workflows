import { type IWorkflowHistoryStore } from "../stores/IWorkflowHistoryStore.js";

export type WorkflowFunction = (...args: any[]) => Promise<any>;

export type WorkflowResultType<W extends WorkflowFunction> = ReturnType<W> extends Promise<infer R> ? R : never;

export type WorkflowHandle<T extends WorkflowFunction> = {
    result: () => Promise<WorkflowResultType<T>>;
    store?: IWorkflowHistoryStore;
    readonly workflowId: string;
};
