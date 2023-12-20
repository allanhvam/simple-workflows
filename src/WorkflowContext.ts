import { type IWorkflowContext } from "./IWorkflowContext";
import { Worker } from "./Worker";

export class WorkflowContext {
    public static current(): IWorkflowContext | undefined {
        return Worker.asyncLocalStorage.getStore();
    }
}
