import { test } from "node:test";
import assert from "node:assert";
import { Worker } from "../Worker.js";
import { greetWorkflow } from "./workflows/greet-workflow.js";
import { incrementCounterWorkflow } from "./workflows/increment-counter-workflow.js";
import { testWorkflow } from "./workflows/test-workflow.js";
import { addWorkflow } from "./workflows/add-workflow.js";
import { voidWorkflow } from "./workflows/void-workflow.js";
import { Counters } from "./activities/Counters.js";
import { timeoutWorkflow } from "./workflows/timeout-workflow.js";
import { distanceWorkflow } from "./workflows/distance-workflow.js";
import { moveWorkflow } from "./workflows/move-workflow.js";
import { throwErrorWorkflow } from "./workflows/throw-error-workflow.js";
import { callTwiceWorkflow } from "./workflows/call-twice-workflow.js";
import { noStore } from "./workflows/no-store.js";
import { nestedWorkflow } from "./workflows/nested-workflow.js";
import { longWorkflow } from "./workflows/long-workflow.js";
import { largeWorkflow } from "./workflows/large-workflow.js";
import { concurrentWorkflow } from "./workflows/concurrent-workflow.js";
import { noTimeoutWorkflow } from "./workflows/no-timeout-workflow.js";
import { nowWorkflow } from "./workflows/now-workflow.js";
import { DurableFunctionsWorkflowHistoryStore } from "../stores/index.js";
import { sleep } from "../sleep.js";
import { throwWorkflow } from "./workflows/throw-workflow.js";
import superjson from "superjson";
import { greetServiceWorkflow } from "./workflows/greet-service-workflow.js";
import { stateServiceWorkflow } from "./workflows/state-service-workflow.js";

let isStorageEmulatorRunning = false;

test.before(async () => {
    const worker = Worker.getInstance();

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
        });
        await store.clear();
        worker.store = store;
    }
    worker.log = (s: string) => console.log(`[${new Date().toISOString()}] ${s}`);
});

void test("greet-workflow, test", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(greetWorkflow, { args: ["test"] });
    const result = await handle.result();

    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, "Hello, test!");

    assert.ok(instance);
    assert.equal(instance.activities.length, 1);
    assert.equal(instance.activities[0].name, "greet");
    assert.equal(instance.activities[0].args.length, 1);
    assert.equal(instance.activities[0].args[0], "test");
    assert.equal(instance.activities[0].result, "Hello, test!");
});

void test("greet-workflow, undefined", async () => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(greetWorkflow, { args: [undefined] });
    const result = await handle.result();

    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, "Hello, undefined!");

    assert.ok(instance);
    assert.equal(instance.activities.length, 1);
    assert.equal(instance.activities[0].name, "greet");
    assert.equal(instance.activities[0].args.length, 1);
    assert.deepEqual(instance.activities[0].args[0], null);
});

void test("greet-service-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(greetServiceWorkflow, { args: ["test"] });
    const result = await handle.result();

    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, "Hello, test!");

    assert.ok(instance);
    assert.equal(instance.activities.length, 1);
    assert.equal(instance.activities[0].name, "GreetService.greet");
    assert.equal(instance.activities[0].args.length, 1);
    assert.deepEqual(instance.activities[0].args[0], "test");
    assert.equal(instance.activities[0].result, "Hello, test!");
});

void test("state-service-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(stateServiceWorkflow, { args: ["42"] });
    const result = await handle.result();

    // Assert
    assert.equal(result, "42");
});

void test("test-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(testWorkflow, { workflowId: "test-42" });
    const result = await handle.result();

    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, "test-42");

    assert.ok(instance);
    assert.equal(instance.instanceId, "test-42");
    assert.equal(instance.activities.length, 1);
    assert.deepEqual(instance.activities[0].args, []);
    assert.equal(instance.activities[0].result, "test-42");
});

void test("increment-counter-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(incrementCounterWorkflow);
    const result = await handle.result();

    // Assert
    assert.equal(result, 1);
});

void test("add-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(addWorkflow);
    const result = await handle.result();

    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, 3);

    assert.ok(instance);
    assert.equal(instance.activities.length, 1);
    assert.equal(instance.activities[0].args.length, 2);
    assert.equal(instance.activities[0].args[0], 1);
    assert.equal(instance.activities[0].args[1], 2);
    assert.equal(instance.activities[0].result, 3);
});

void test("add-workflow args", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(addWorkflow, { args: [3, 4] });
    const result = await handle.result();

    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, 7);

    assert.ok(instance);
    assert.equal(instance.args.length, 2);
    assert.equal(instance.args[0], 3);
    assert.equal(instance.args[1], 4);

    assert.equal(instance.activities.length, 1);
    assert.equal(instance.activities[0].args.length, 2);
    assert.equal(instance.activities[0].args[0], 3);
    assert.equal(instance.activities[0].args[1], 4);
    assert.equal(instance.activities[0].result, 7);
});

void test("void-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(voidWorkflow, { workflowId: "void" });
    await handle.result();

    handle = await worker.start(voidWorkflow, { workflowId: "void" });
    await handle.result();

    // Assert
    assert.equal(Counters.get("void"), 1);
});

void test("timeout-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(timeoutWorkflow, {
        workflowId: "timeout",
        workflowExecutionTimeout: "1s",
    });

    await assert.rejects(async () => {
        await handle.result();
    }, "Expected timeout-workflow to throw");

    // Assert
    assert.equal(Counters.get("timeout-start"), 1);
    await sleep("3s");
    // Note: tests that activity execution is stopped
    assert.equal(Counters.get("timeout-end"), 0);

    const instance = await worker.store.getInstance(handle.workflowId);
    assert.ok(instance);
    assert.equal(instance.status, "timeout");
});

void test("no-timeout-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(noTimeoutWorkflow, {
        workflowId: "no-timeout",
        workflowExecutionTimeout: "5s",
    });

    await handle.result();
    await sleep("1s");

    // Assert
    assert.equal(Counters.get("no-timeout-start"), 1);
    assert.equal(Counters.get("no-timeout-end"), 1);

    const instance = await worker.store.getInstance(handle.workflowId);
    assert.ok(instance);
    assert.notEqual(instance.status, "timeout");
});

void test("distance-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(distanceWorkflow, { workflowId: "distance" });
    const result = await handle.result();

    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, 2);

    assert.ok(instance);
    assert.equal(instance.activities.length, 2);
    assert.equal(instance.activities[0].args.length, 2);
    assert.deepEqual(instance.activities[0].args[0], { x: 1, y: 1 });
    assert.deepEqual(instance.activities[0].args[1], { x: 2, y: 1 });
    assert.equal(instance.activities[0].result, 1);
    assert.deepEqual(instance.activities[1].args[0], { x: 3, y: 1 });
    assert.deepEqual(instance.activities[1].args[1], { x: 2, y: 1 });
    assert.equal(instance.activities[1].result, 1);
});

void test("move-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(moveWorkflow, { workflowId: "move" });
    const result = await handle.result();

    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.deepEqual(result, { x: 0, y: 2 });

    assert.ok(instance);
    assert.equal(instance.activities.length, 2);
    assert.deepEqual(instance.activities[0].args[0], { x: 0, y: 0 });
    assert.deepEqual(instance.activities[1].args[0], { x: 0, y: 1 });
});

void test("throw-error-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act & Assert
    const workflowId = "throw-error";
    try {
        const handle = await worker.start(throwErrorWorkflow, { workflowId });
        await handle.result();
        assert.fail();
    } catch {
        // Ignore, expected to throw
    }

    const instance = await worker.store.getInstance(workflowId);
    assert.ok(instance?.end, "Expected instance end to be set.");
    assert.deepEqual(instance.result, undefined, "Expected instance result to be undefined.");
    assert.ok(instance.error, "Expected error to be set");
    assert.ok(instance.error instanceof Error, "Expected error to be instance of Error");

    assert.ok(instance);
    assert.equal(instance.activities.length, 1);
    const activity = instance.activities[0];
    assert.deepEqual(activity.args[0], "Message 1");
    assert.ok(instance.end);
    assert.deepEqual(activity.result, undefined);
    assert.ok(activity.error, "Expected error to be set");
    assert.ok(activity.error instanceof Error, "Expected error to be instance of Error");

    assert.ok(activity.start instanceof Date);
    assert.ok(activity.end instanceof Date);
});

void test("throw-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(throwWorkflow, { workflowId: "throw" });

    // Assert
    try {
        await handle.result();
    } catch (e) {
        assert.equal(typeof e, "string");
    }

    const instance = await worker.store.getInstance(handle.workflowId);
    assert.ok(instance);
    assert.ok(instance.end, "Expected instance end to be set.");
    assert.deepEqual(instance.result, undefined, "Expected instance result to be undefined.");
    assert.ok(instance.error, "Expected error to be set");
    assert.equal(typeof instance.error, "string", "Expected error to be string");
    assert.equal(instance.error, "Message 1");
});

void test("call-twice-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(callTwiceWorkflow);
    const result = await handle.result();

    // Assert
    assert.equal(result, "ok");
});

void test("no-store", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(noStore, { store: undefined });
    const result = await handle.result();

    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, "OK");
    assert.ok(!instance);
});

void test("nested-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(nestedWorkflow, { workflowId: "parent" });
    await handle.result();

    const parent = await worker.store.getInstance("parent");
    const child = await worker.store.getInstance("child");

    // Assert
    assert.ok(parent !== undefined);
    assert.ok(child !== undefined);
    assert.ok(parent.start instanceof Date, "Expected workflow instance start to be Data");
    assert.ok(parent.end instanceof Date, "Expected workflow instance end to be Data");

    assert.ok(parent.start && parent.end);
    assert.ok(child.start && child.end);
    assert.ok(parent.start < child.start);
    assert.ok(parent.end > child.end);
});

void test("long-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(longWorkflow, { workflowId: "long" });
    await handle.result();

    const large = await worker.store.getInstance("long");

    // Assert
    assert.ok(large !== undefined);
    assert.equal(large.activities.length, 125);
});

void test("large-workflow", async (t) => {
    // Arrange
    const long = Array.from(Array(100000).keys()).map(i => "A").join("");
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(largeWorkflow, {
        args: [long],
        workflowId: "large",
    });
    await handle.result();

    const large = await worker.store.getInstance("large");

    // Assert
    assert.ok(large !== undefined);
    assert.equal(large.activities.length, 1);
    const activity = large.activities[0];
    const result = activity.result as Array<any>;
    assert.ok(result.length >= 10000);
});

void test("concurrent-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(concurrentWorkflow, { workflowId: "concurrent" });
    await handle.result();

    // Assert
    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.ok(instance);
    assert.ok(instance.activities);
    assert.equal(instance.activities.length, 10);
});

void test("greet-workflow-no-await-result", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(greetWorkflow, { args: ["test no await"] });
    await sleep("5s");

    const instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.ok(instance);
    assert.ok(instance.end, "Expected the workflow to have ended");
    assert.equal(instance.result, "Hello, test no await!");
});

void test("now", async (t) => {
    if (!isStorageEmulatorRunning) {
        // Skip
        assert.ok(true);
        return;
    }
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(nowWorkflow, {
        store: new DurableFunctionsWorkflowHistoryStore({
            connectionString: "UseDevelopmentStorage=true",
            serializer: superjson,
        }),
    });

    const result = await handle.result();

    const instance = await handle.store?.getInstance(handle.workflowId);

    // Assert
    assert.ok(result instanceof Date, "Expected result to be Date");
    assert.ok(instance);
    assert.ok(instance.result instanceof Date, "Expected result to be Date");
});
