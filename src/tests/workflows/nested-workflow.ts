import { Worker } from "../../Worker";
import { WorkflowContext } from "../../WorkflowContext";

async function childWorkflow(): Promise<void> {
    const id = WorkflowContext.current()?.workflowId;
    if (id !== "child") {
        return await Promise.reject(new Error());
    }

    const parent = await Worker.getInstance().store.getInstance("parent");

    // Expect the parent workflow to be started, but not ended
    if (!parent || !parent.start || parent.end) {
        return await Promise.reject(new Error());
    }
}

export async function nestedWorkflow(): Promise<void> {
    const id = WorkflowContext.current()?.workflowId;
    if (id !== "parent") {
        return await Promise.reject(new Error());
    }

    const handle = await Worker.getInstance().start(childWorkflow, { workflowId: "child" });
    await handle.result();
}
