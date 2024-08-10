import { type IWorkflowContext } from "./IWorkflowContext.js";
import { Worker } from "./Worker.js";

export class WorkflowContext {
    public static current(): IWorkflowContext | undefined {
        return Worker.asyncLocalStorage.getStore();
    }
}
