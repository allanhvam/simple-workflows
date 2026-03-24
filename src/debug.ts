import { Worker } from "./worker/Worker.ts";
import { greetWorkflow } from "./tests/workflow-functions/greet-workflow.ts";
import { FileSystemWorkflowHistoryStore } from "./stores/FileSystemWorkflowHistoryStore.ts";

const run = async (): Promise<void> => {
    const worker = Worker.getInstance();
    const store = new FileSystemWorkflowHistoryStore();
    worker.store = store;

    const handle = await worker.start(greetWorkflow, {
        args: ["debug"],
        workflowId: "debug",
    });

    // Assert
    console.log(`Started workflow ${handle.workflowId}`);

    const result = await handle.result();
    console.dir(result);

    let instances = await store.getInstances();
    while (instances.instances.length !== 0) {
        for (let i = 0; i !== instances.instances.length; i++) {
            const instance = instances.instances[i];
            await store.removeInstance(instance.instanceId);
        }
        if (!instances.continuationToken) {
            break;
        }
        instances = await store.getInstances({ continuationToken: instances.continuationToken });
    }
};

run().then(() => {
    process.exit();
}).catch((e) => {
    console.error(e);
});
