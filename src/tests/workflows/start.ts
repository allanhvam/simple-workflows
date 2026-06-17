import { manual } from "../../triggers/manual.ts";
import { WorkflowContext } from "../../worker/WorkflowContext.ts";
import { workflow } from "../../workflows/index.ts";

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
