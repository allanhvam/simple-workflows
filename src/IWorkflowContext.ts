import { IWorkflowHistoryStore } from "./stores/IWorkflowHistoryStore";
import { MutexInterface } from "async-mutex";

export interface IWorkflowContext {
    workflowId: string;
    store: IWorkflowHistoryStore,
    log: (f: () => string) => void;
    // @internal
    mutex: MutexInterface;
}