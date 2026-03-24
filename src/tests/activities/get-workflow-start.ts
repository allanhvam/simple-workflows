import { WorkflowContext } from "../../worker/WorkflowContext.ts";

export async function getWorkflowStart(): Promise<Date | undefined> {
    return WorkflowContext.current()?.start;
}
