import test from "ava";
import { Worker } from "../Worker";
import { greetWorkflow } from "./workflows/greet-workflow";
import { incrementCounterWorkflow } from "./workflows/increment-counter-workflow";
import { testWorkflow } from "./workflows/test-workflow";
import { addWorkflow } from "./workflows/add-workflow";
import { voidWorkflow } from "./workflows/void-workflow";
import { Counters } from "./activities/Counters";
import { timeoutWorkflow } from "./workflows/timeout-workflow";
import { distanceWorkflow } from "./workflows/distance-workflow";
import { moveWorkflow } from "./workflows/move-workflow";
import { throwWorkflow } from "./workflows/throw-workflow";
import { callTwiceWorkflow } from "./workflows/call-twice-workflow";
import { noStore } from "./workflows/no-store";
import { nestedWorkflow } from "./workflows/nested-workflow";
import { longWorkflow } from "./workflows/long-workflow";
import { largeWorkflow } from "./workflows/large-workflow";
import { concurrentWorkflow } from "./workflows/concurrent-workflow";
import { noTimeoutWorkflow } from "./workflows/no-timeout-workflow";
import { FileSystemWorkflowHistoryStore, MemoryWorkflowHistoryStore, DurableFunctionsWorkflowHistoryStore } from "../stores";
import { sleep } from "../sleep";

test.before(async () => {
    const worker = Worker.getInstance();
    let store = new DurableFunctionsWorkflowHistoryStore("UseDevelopmentStorage=true");
    // let store = new FileSystemWorkflowHistoryStore();
    await store.clear();
    // let store = new MemoryWorkflowHistoryStore();
    worker.store = store;
    worker.log = (s: string) => console.log(`[${new Date().toISOString()}] ${s}`);
});

test("greet-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(greetWorkflow, { args: ["test"] });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    t.is(result, "Hello, test!");

    t.truthy(instance);
    t.is(instance.activities.length, 1);
    t.is(instance.activities[0].args.length, 1);
    t.deepEqual(instance.activities[0].args[0], "test");
    t.is(instance.activities[0].result, "Hello, test!");
});

test("test-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(testWorkflow, { workflowId: "test-42" });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    t.is(result, "test-42");

    t.truthy(instance);
    t.is(instance.instanceId, "test-42");
    t.is(instance.activities.length, 1);
    t.deepEqual(instance.activities[0].args, []);
    t.is(instance.activities[0].result, "test-42");
});

test("increment-counter-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(incrementCounterWorkflow);
    let result = await handle.result();

    // Assert
    t.is(result, 1);
});

test("add-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(addWorkflow);
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    t.is(result, 3);

    t.truthy(instance);
    t.is(instance.activities.length, 1);
    t.is(instance.activities[0].args.length, 2);
    t.is(instance.activities[0].args[0], 1);
    t.is(instance.activities[0].args[1], 2);
    t.is(instance.activities[0].result, 3);
});

test("add-workflow args", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(addWorkflow, { args: [3, 4] });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    t.is(result, 7);

    t.truthy(instance);
    t.is(instance.args.length, 2);
    t.is(instance.args[0], 3);
    t.is(instance.args[1], 4);

    t.is(instance.activities.length, 1);
    t.is(instance.activities[0].args.length, 2);
    t.is(instance.activities[0].args[0], 3);
    t.is(instance.activities[0].args[1], 4);
    t.is(instance.activities[0].result, 7);
});

test("void-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(voidWorkflow, { workflowId: "void" });
    let result = await handle.result();

    handle = await worker.start(voidWorkflow, { workflowId: "void" });
    result = await handle.result();

    // Assert
    t.falsy(result);

    t.is(Counters.get("void"), 1);
});

test("timeout-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(timeoutWorkflow, {
        workflowId: "timeout",
        workflowExecutionTimeout: "1s",
    });

    await t.throwsAsync(async () => {
        await handle.result();
    }, undefined, "Expected timeout-workflow to throw");

    // Assert
    t.is(Counters.get("timeout-start"), 1);
    await sleep(5000);
    // Note: tests that activity execution is stopped
    t.is(Counters.get("timeout-end"), 0);

    let instance = await worker.store.getInstance(handle.workflowId);
    t.is(instance.status, "timeout");
});

test("no-timeout-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(noTimeoutWorkflow, {
        workflowId: "no-timeout",
        workflowExecutionTimeout: "5s",
    });

    await handle.result();
    await sleep(10000);

    // Assert
    t.is(Counters.get("no-timeout-start"), 1);
    t.is(Counters.get("no-timeout-end"), 1);

    let instance = await worker.store.getInstance(handle.workflowId);
    t.not(instance.status, "timeout");
});

test("distance-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(distanceWorkflow, { workflowId: "distance" });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    t.is(result, 2);

    t.truthy(instance);
    t.is(instance.activities.length, 2);
    t.is(instance.activities[0].args.length, 2);
    t.deepEqual(instance.activities[0].args[0], { x: 1, y: 1 });
    t.deepEqual(instance.activities[0].args[1], { x: 2, y: 1 });
    t.is(instance.activities[0].result, 1);
    t.deepEqual(instance.activities[1].args[0], { x: 3, y: 1 });
    t.deepEqual(instance.activities[1].args[1], { x: 2, y: 1 });
    t.is(instance.activities[1].result, 1);
});

test("move-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(moveWorkflow, { workflowId: "move" });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    t.deepEqual(result, { x: 0, y: 2 });

    t.truthy(instance);
    t.is(instance.activities.length, 2);
    t.deepEqual(instance.activities[0].args[0], { x: 0, y: 0 });
    t.deepEqual(instance.activities[1].args[0], { x: 0, y: 1 });
});

test("throw-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(throwWorkflow, { workflowId: "throw" });

    // Assert
    await t.throwsAsync(async () => {
        await handle.result();
    });

    let instance = await worker.store.getInstance(handle.workflowId);
    t.truthy(instance.end, "Expected instance end to be set.");
    t.deepEqual(instance.result, undefined, "Expected instance result to be undefined.");
    t.truthy(instance.error, "Expected error to be set");
    t.true(instance.error instanceof Error, "Expected error to be instance of Error");

    t.truthy(instance);
    t.is(instance.activities.length, 1);
    let activity = instance.activities[0];
    t.deepEqual(activity.args[0], "Message 1");
    t.truthy(instance.end);
    t.deepEqual(activity.result, undefined);
    t.truthy(activity.error, "Expected error to be set");
    t.true(activity.error instanceof Error, "Expected error to be instance of Error");

    t.truthy(activity.start instanceof Date);
    t.truthy(activity.end instanceof Date);
});

test("call-twice-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(callTwiceWorkflow);
    let result = await handle.result();

    // Assert
    t.is(result, "ok");
});

test("no-store", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(noStore, { store: undefined });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    t.is(result, "OK");
    t.falsy(instance);
});

test("nested-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(nestedWorkflow, { workflowId: "parent" });
    await handle.result();

    let parent = await worker.store.getInstance("parent");
    let child = await worker.store.getInstance("child");

    // Assert
    t.true(parent !== undefined);
    t.true(child !== undefined);
    t.true(parent.start instanceof Date, "Expected workflow instance start to be Data");
    t.true(parent.end instanceof Date, "Expected workflow instance end to be Data");

    t.truthy(parent.start && parent.end);
    t.truthy(child.start && child.end);
    t.true(parent.start < child.start);
    t.true(parent.end > child.end);
});

test("long-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(longWorkflow, { workflowId: "long" });
    await handle.result();

    let large = await worker.store.getInstance("long");

    // Assert
    t.true(large !== undefined);
    t.is(large.activities.length, 125);
});

test("large-workflow", async (t) => {
    // Arrange
    let long = Array.from(Array(100000).keys()).map(i => "A").join("");
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(largeWorkflow, {
        args: [long],
        workflowId: "large",
    });
    await handle.result();

    let large = await worker.store.getInstance("large");

    // Assert
    t.true(large !== undefined);
    t.is(large.activities.length, 1);
    let activity = large.activities[0];
    t.true(activity.result.length >= 10000);
});

test("concurrent-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(concurrentWorkflow, { workflowId: "concurrent" });
    await handle.result();

    // Assert
    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    t.truthy(instance);
    t.truthy(instance.activities);
    t.is(instance.activities.length, 10);
});

test("greet-workflow-no-await-result", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(greetWorkflow, { args: ["test no await"] });
    await sleep("5s");

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    t.truthy(instance.end, "Expected the workflow to have ended")
    t.is(instance.result, "Hello, test no await!");
});