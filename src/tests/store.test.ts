import { test } from "node:test";
import assert from "node:assert";
import { Worker } from "../Worker";
import { testWorkflow } from "./workflows/test-workflow";
import { DurableFunctionsWorkflowHistoryStore, MemoryWorkflowHistoryStore, type WorkflowInstanceHeader } from "../stores";

test.before(async () => {
    const worker = Worker.getInstance();

    let isStorageEmulatorRunning = false;
    try {
        const response = await fetch("http://127.0.0.1:10000");
        if (response.status === 400) {
            isStorageEmulatorRunning = true;
        }
    } catch {
        console.log("Storage emulator not running, using memory.");
    }

    if (isStorageEmulatorRunning) {
        const store = new DurableFunctionsWorkflowHistoryStore({
            connectionString: "UseDevelopmentStorage=true",
            taskHubName: "StoreTestWorkflow",
        });
        await store.clear();
        worker.store = store;
    }
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
    let workflowInstances = await store.getInstances();

    // Assert
    let workflow = workflowInstances.instances.find(wi => wi.instanceId === workflowId);
    assert.ok(workflow);
    await store.removeInstance(workflow.instanceId);

    workflowInstances = await store.getInstances();
    workflow = workflowInstances.instances.find(wi => wi.instanceId === workflowId);
    assert.ok(!workflow);
});

void test("Workflow store, getInstances options", async (t) => {
    // Arrange
    const worker = Worker.getInstance();
    const store = new MemoryWorkflowHistoryStore();

    let halfDate = new Date();
    let eightyDate = new Date();

    for (let i = 0; i !== 100; i++) {
        if (i === 50) {
            halfDate = new Date();
        }
        if (i === 80) {
            eightyDate = new Date();
        }
        const handle = await worker.start(testWorkflow, {
            workflowId: i.toString(),
            store,
        });
        await handle.result();
    }

    // Act
    const half = await store.getInstances({ filter: { from: halfDate } });
    const thirty = await store.getInstances({ filter: { from: halfDate, to: eightyDate } });

    const all = new Array<WorkflowInstanceHeader>();
    let continuationToken: string | undefined = "";
    while (continuationToken !== undefined) {
        const result = await store.getInstances({ continuationToken, pageSize: 10 });
        continuationToken = result.continuationToken;
        all.push(...result.instances);
    }

    // Assert
    assert.equal(half.instances.length, 50);
    assert.equal(thirty.instances.length, 30);
    assert.equal(all.length, 100);
});
