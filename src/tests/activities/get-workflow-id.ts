import { WorkflowContext } from "../../WorkflowContext";

export async function getWorkflowId(): Promise<string | undefined> {
    return WorkflowContext.current()?.workflowId;
}