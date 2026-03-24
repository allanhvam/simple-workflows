import type { IWorkflowContext } from "./IWorkflowContext.ts";
import { Worker } from "./Worker.ts";

export class WorkflowContext {
    public static current(): IWorkflowContext | undefined {
        return Worker.asyncLocalStorage.getStore();
    }
}
