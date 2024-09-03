import { Worker } from "../../worker/Worker.js";
import { WorkflowContext } from "../../worker/WorkflowContext.js";
import { sleep } from "../activities/index.js";

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

    await sleep("5ms");

    const handle = await Worker.getInstance().start(childWorkflow, {
        workflowId: "child",
    });
    await handle.result();

    await sleep("5ms");
}
