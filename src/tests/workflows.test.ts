import { test } from "node:test";
import assert from "node:assert";
import { Worker } from "../worker/Worker.ts";
import { DurableFunctionsWorkflowHistoryStore } from "../stores/index.ts";
import { math } from "./workflows/math.ts";
import { workflows } from "../workflows/index.ts";
import { addTwo } from "./workflows/add-two.ts";
import { ms } from "../ms.ts";
import { start } from "./workflows/start.ts";
import { promiseLike } from "./workflows/promise-like.ts";
import { publicPart } from "./workflows/public-part.ts";

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

void test("Workflow", async () => {
    // Arrange
    const workflow = math;
    const worker = Worker.getInstance();
    const store = worker.store;

    // Act
    const result = await workflow.invoke();

    // Assert
    assert.equal(result, 3);
    assert.ok(workflows.has(workflow.name));

    const now = new Date();
    const from = new Date(now.getTime() - ms("2m"));
    const instances = await store.getInstances({ filter: { from, to: now } });
    const mathInstances = instances.instances.filter(i => i.instanceId.indexOf(`${workflow.name} `) === 0);

    assert.ok(mathInstances.length >= 1);
});

void test("Workflow add-two", async () => {
    // Arrange
    const workflow = addTwo;

    // Act
    const result = await workflow.invoke(2) satisfies number;

    // Assert
    assert.equal(result, 4);
});

void test("Workflow start", async () => {
    // Arrange
    const workflow = start;
    const worker = Worker.getInstance();
    const store = worker.store;

    // Act
    const result = await workflow.invoke() satisfies ({ id: string | undefined; start: Date | undefined });

    // Assert
    assert.ok(result);
    assert.ok(result.id);

    const instance = await store.getInstance(result.id);
    assert.ok(instance);
    assert.ok(instance.start);
    assert.equal(result.start?.toString(), instance.start.toString());
});

void test("Workflow promise-like", async () => {
    // Arrange
    const workflow = promiseLike;
    const worker = Worker.getInstance();
    const store = worker.store;

    // Act
    const result = await workflow.invoke();

    // Assert
    assert.ok(result);
    assert.ok(result.id);
    assert.equal(result.result, 3);

    const instance = await store.getInstance(result.id);
    assert.ok(instance);
});

void test("Workflow public-part", async () => {
    // Arrange
    const worker = Worker.getInstance();
    const store = worker.store;

    // Act, NOTE: math does not have private member z
    const result = await publicPart.run({
      math: {
        add: async (x: number, y: number) => {
          return Promise.resolve(x + y);
        },
      },
    })();

    // Assert
    assert.ok(result);
    assert.ok(result.id);
    assert.equal(result.result, 3);

    const instance = await store.getInstance(result.id);
    assert.ok(instance);
});