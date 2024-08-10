import { Worker } from "./Worker.js";
import { greetWorkflow } from "./tests/workflows/greet-workflow.js";
import { FileSystemWorkflowHistoryStore } from "./stores/FileSystemWorkflowHistoryStore.js";

const run = async (): Promise<void> => {
    const worker = Worker.getInstance();
    worker.store = new FileSystemWorkflowHistoryStore();

    const handle = await worker.start(greetWorkflow, {
        args: ["debug"],
        workflowId: "debug",
    });

    // Assert
    console.log(`Started workflow ${handle.workflowId}`);

    const result = await handle.result();
    console.dir(result);
};

run().then(() => {
    process.exit();
}).catch((e) => {
    console.error(e);
});
