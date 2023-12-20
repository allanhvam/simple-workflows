import { Worker } from "../../Worker";
import { WorkflowContext } from "../../WorkflowContext";

async function childWorkflow(): Promise<void> {
    let id = WorkflowContext.current()?.workflowId;
    if (id !== "child") {
        return Promise.reject(new Error());
    }

    let parent = await Worker.getInstance().store.getInstance("parent");

    // Expect the parent workflow to be started, but not ended
    if (!parent || !parent.start || parent.end) {
        return Promise.reject(new Error());
    }
}

export async function nestedWorkflow(): Promise<void> {
    let id = WorkflowContext.current()?.workflowId;
    if (id !== "parent") {
        return Promise.reject(new Error());
    }

    let handle = await Worker.getInstance().start(childWorkflow, { workflowId: "child" });
    await handle.result();
}
