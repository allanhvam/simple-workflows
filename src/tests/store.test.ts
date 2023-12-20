import { test } from "node:test";
import assert from "node:assert";
import * as stores from "../stores";
import { Worker } from "../Worker";
import { testWorkflow } from "./workflows/test-workflow";

test.before(async () => {
    const worker = Worker.getInstance();
    const store = new stores.DurableFunctionsWorkflowHistoryStore({ connectionString: "UseDevelopmentStorage=true", taskHubName: "StoreTestWorkflow" });
    // let store = new FileSystemWorkflowHistoryStore();
    await store.clear();
    // let store = new MemoryWorkflowHistoryStore();
    worker.store = store;
    worker.log = (s: string) => console.log(`[${new Date().toISOString()}] ${s}`);
});

void test("Workflow store, removeInstance", async (t) => {
    // Arrange
    const workflowId = "test-store";
    const worker = Worker.getInstance();
    const store = worker.store;

    const handle = await worker.start(testWorkflow, { workflowId });
    await handle.result();

    // Act
    let workflowInstances = await store.getInstanceHeaders();

    // Assert
    let workflow = workflowInstances.find(wi => wi.instanceId === workflowId);
    assert.ok(workflow);
    await store.removeInstance(workflow.instanceId);

    workflowInstances = await store.getInstanceHeaders();
    workflow = workflowInstances.find(wi => wi.instanceId === workflowId);
    assert.ok(!workflow);
});
