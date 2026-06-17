import { WorkflowContext } from "../../worker/WorkflowContext.ts";

export async function getWorkflowId(): Promise<string | undefined> {
    return WorkflowContext.current()?.workflowId;
}
