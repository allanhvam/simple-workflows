import { test } from "node:test";
import assert from "node:assert";
import { Worker } from "../worker/Worker.js";
import { DurableFunctionsWorkflowHistoryStore } from "../stores/index.js";
import { startup } from "./workflows/startup.js";
import { sleep } from "../sleep.js";

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
            taskHubName: "Workflows",
        });
        await store.clear();
        worker.store = store;
    }
    worker.log = (s: string) => console.log(`[${new Date().toISOString()}] ${s}`);
});

void test("startup trigger args", async (t) => {
    // Arrange
    const workflow = startup;
    const worker = Worker.getInstance();
    const store = worker.store;

    // Act
    await workflow.start();
    await sleep("1s"); // Wait for trigger to fire

    // Assert
    const result = await store.getInstances();
    const instanceHeader = result.instances.find(i => i.instanceId.startsWith(workflow.name));
    assert.ok(instanceHeader);

    const instance = await store.getInstance(instanceHeader.instanceId);

    assert.ok(instance);
    assert.deepEqual(instance?.args, [undefined]);
});
