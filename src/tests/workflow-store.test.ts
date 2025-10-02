import { test } from "node:test";
import assert from "node:assert";
import { Worker } from "../worker/Worker.js";
import { MemoryWorkflowHistoryStore } from "../stores/index.js";
import { workflow } from "../workflows/index.js";

test.before(async () => {
    const worker = Worker.getInstance();
    worker.log = (s: string) => console.log(`[${new Date().toISOString()}] ${s}`);
});

void test("Workflow local store", async (t) => {
    // Arrange
    const store = new MemoryWorkflowHistoryStore();

    const w = workflow({
        name: "test-workflow-local-store",
        store,
        run: () => async () => {
        },
    });

    // Act
    await w.invoke(undefined);

    // Assert
    const { instances } = await store.getInstances();
    let instance = instances.find(i =>
        i.instanceId.indexOf(`${w.name} `) === 0,
    );
    assert.ok(instance, "Workflow instance should be in custom store");

    const { instances: globalInstances } = await Worker.getInstance().store.getInstances();
    instance = globalInstances.find(i =>
        i.instanceId.startsWith(`${w.name} `),
    );
    assert.ok(!instance, "Workflow instance should NOT be in global store");
});

void test("Workflow global store", async (t) => {
    // Arrange
    const w = workflow({
        name: "test-workflow-global-store",
        run: () => async () => {
        },
    });

    // Act
    await w.invoke();

    // Assert
    const { instances } = await Worker.getInstance().store.getInstances();
    const instance = instances.find(i =>
        i.instanceId.startsWith(`${w.name} `),
    );
    assert.ok(instance, "Workflow instance should be in global store");
});

void test("Workflow undefined store", async (t) => {
    // Arrange
    const w = workflow({
        name: "test-workflow-undefined-store",
        store: undefined,
        run: () => async () => {
        },
    });

    // Act
    await w.invoke(undefined);

    // Assert
    const { instances: globalInstances } = await Worker.getInstance().store.getInstances();
    const instance = globalInstances.find(i =>
        i.instanceId.startsWith(`${w.name} `),
    );
    assert.ok(!instance, "Workflow instance should NOT be in global store");
});
