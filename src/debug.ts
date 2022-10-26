import { Worker } from "./Worker";
import { greetWorkflow } from "./tests/workflows/greet-workflow";
import { FileSystemWorkflowHistoryStore } from "./stores/FileSystemWorkflowHistoryStore";

let run = async () => {
    const worker = Worker.getInstance();
    worker.store = new FileSystemWorkflowHistoryStore();

    const handle = await worker.start(greetWorkflow, {
        args: ["debug"],
        workflowId: "debug",
    });

    // Assert
    console.log(`Started workflow ${handle.workflowId}`);

    let result = await handle.result();
    console.dir(result);
};

run().then(() => {
    process.exit();
}).catch((e) => {
    console.error(e);
});