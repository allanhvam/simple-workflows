import { WorkflowContext } from "../../worker/WorkflowContext.js";

export async function getWorkflowStart(): Promise<Date | undefined> {
    return WorkflowContext.current()?.start;
}
