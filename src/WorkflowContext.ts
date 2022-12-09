import { IWorkflowContext } from "./IWorkflowContext";
import { Worker } from "./Worker";

export class WorkflowContext {
    public static current() : IWorkflowContext {
        return Worker.asyncLocalStorage.getStore();
    }
}