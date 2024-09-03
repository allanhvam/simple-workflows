import { type IWorkflowHistoryStore } from "../stores/IWorkflowHistoryStore.js";
import { type MutexInterface } from "async-mutex";

export interface IWorkflowContext {
    workflowId: string
    store?: IWorkflowHistoryStore
    log: (f: () => string) => void
    // @internal
    mutex: MutexInterface
}
