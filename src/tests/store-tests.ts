import test from "ava";
import * as stores from "../stores";
import { Worker } from "../Worker";
import { testWorkflow } from "./workflows/test-workflow";

test.before(async () => {
    const worker = Worker.getInstance();
    let store = new stores.DurableFunctionsWorkflowHistoryStore({ connectionString: "UseDevelopmentStorage=true", taskHubName: "StoreTestWorkflow" });
    // let store = new FileSystemWorkflowHistoryStore();
    await store.clear();
    // let store = new MemoryWorkflowHistoryStore();
    worker.store = store;
    worker.log = (s: string) => console.log(`[${new Date().toISOString()}] ${s}`);
});

test("Workflow store, removeInstance", async (t) => {
    // Arrange
    const workflowId = "test-store";
    const worker = Worker.getInstance();
    const store = worker.store;

    const handle = await worker.start(testWorkflow, { workflowId });
    await handle.result();

    // Act
    let workflowInstances = await store.getInstances();

    // Assert
    let workflow = workflowInstances.find(wi => wi.instanceId === workflowId);
    t.truthy(workflow);
    await store.removeInstance(workflow.instanceId);

    workflowInstances = await store.getInstances();
    workflow = workflowInstances.find(wi => wi.instanceId === workflowId);
    t.falsy(workflow);
});