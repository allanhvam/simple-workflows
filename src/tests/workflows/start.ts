import { manual } from "../../triggers/manual.js";
import { WorkflowContext } from "../../worker/WorkflowContext.js";
import { workflow } from "../../workflows/index.js";

export const start = workflow({
    name: "start",
    description: "Returns when the workflow was started.",
    trigger: manual(),
    run: () => async () => {
        return {
            id: WorkflowContext.current()?.workflowId,
            start: WorkflowContext.current()?.start,
        };
    },
});
