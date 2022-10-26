import { WorkflowContext } from "../../WorkflowContext";

export async function getWorkflowId(): Promise<string> {
    return WorkflowContext.current().workflowId;
}