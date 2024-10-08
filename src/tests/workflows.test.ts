import { test } from "node:test";
import assert from "node:assert";
import { Worker } from "../worker/Worker.js";
import { DurableFunctionsWorkflowHistoryStore } from "../stores/index.js";
import { math } from "./workflows/math.js";
import { workflows } from "../workflows/index.js";
import ms from "ms";
import { WorkflowWorker } from "../index.js";

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

void test("Workflow", async (t) => {
    // Arrange
    const workflow = math;
    const worker = Worker.getInstance();
    const store = worker.store;

    // Act
    const result = await workflow.invoke();

    // Assert
    assert.equal(result, 3);
    assert.ok(workflows.has("math"));

    const now = new Date();
    const from = new Date(now.getTime() - ms("2m"));    
    const instances = await store.getInstances({ filter: { from: from, to: now } });
    const mathInstances = instances.instances.filter(i => i.instanceId.indexOf("math ") === 0);

    assert.ok(mathInstances.length >= 1);
});

