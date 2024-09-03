import { WorkflowContext } from "../../worker/WorkflowContext.js";

export async function getWorkflowId(): Promise<string | undefined> {
    return WorkflowContext.current()?.workflowId;
}
