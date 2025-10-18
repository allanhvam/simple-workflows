import { test } from "node:test";
import assert from "node:assert";
import { Worker } from "../worker/Worker.js";
import { testWorkflow } from "./workflow-functions/test-workflow.js";
import { DurableFunctionsWorkflowHistoryStore, MemoryWorkflowHistoryStore, type WorkflowInstanceHeader } from "../stores/index.js";
import { sleep } from "../sleep.js";
import { throwErrorWorkflow } from "./workflow-functions/throw-error-workflow.js";

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
            taskHubName: "Store",
        });
        await store.clear();
        worker.store = store;
    }
    worker.log = (s: string) => console.log(`[${new Date().toISOString()}] ${s}`);
});

void test("Workflow store, removeInstance", async () => {
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

void test("Workflow store, getInstances options", async () => {
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
        await sleep("1ms");
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

void test("Workflow store, getInstances error", async () => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let workflowId: string | undefined;
    try {
        const handle = await worker.start(throwErrorWorkflow);
        workflowId = handle.workflowId;
        await handle.result();
        assert.fail();
    } catch {
        // Ignore, expected to throw
    }

    // Assert
    const instances = await worker.store.getInstances();
    const instance = instances.instances.find(wi => wi.instanceId === workflowId);
    assert.ok(instance, "Expected instance to be found.");
    assert.ok(instance.error, "Expected error to be true.");
});
