import { type IWorkflowHistoryStore } from "./stores/IWorkflowHistoryStore";
import { type MutexInterface } from "async-mutex";

export interface IWorkflowContext {
    workflowId: string
    store?: IWorkflowHistoryStore
    log: (f: () => string) => void
    // @internal
    mutex: MutexInterface
}
