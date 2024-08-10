import { WorkflowContext } from "../../WorkflowContext.js";

export async function getWorkflowId(): Promise<string | undefined> {
    return WorkflowContext.current()?.workflowId;
}
