import { test } from "node:test";
import assert from "node:assert";
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
import { throwErrorWorkflow } from "./workflows/throw-error-workflow";
import { callTwiceWorkflow } from "./workflows/call-twice-workflow";
import { noStore } from "./workflows/no-store";
import { nestedWorkflow } from "./workflows/nested-workflow";
import { longWorkflow } from "./workflows/long-workflow";
import { largeWorkflow } from "./workflows/large-workflow";
import { concurrentWorkflow } from "./workflows/concurrent-workflow";
import { noTimeoutWorkflow } from "./workflows/no-timeout-workflow";
import { nowWorkflow } from "./workflows/now-workflow";
import { FileSystemWorkflowHistoryStore, MemoryWorkflowHistoryStore, DurableFunctionsWorkflowHistoryStore } from "../stores";
import { sleep } from "../sleep";
import { throwWorkflow } from "./workflows/throw-workflow";
import superjson from 'superjson';
import { greetServiceWorkflow } from "./workflows/greet-service-workflow";

test.before(async () => {
    const worker = Worker.getInstance();
    let store = new DurableFunctionsWorkflowHistoryStore({ connectionString: "UseDevelopmentStorage=true" });
    // let store = new FileSystemWorkflowHistoryStore();
    await store.clear();
    // let store = new MemoryWorkflowHistoryStore();
    worker.store = store;
    worker.log = (s: string) => console.log(`[${new Date().toISOString()}] ${s}`);
});

test("greet-workflow, test", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(greetWorkflow, { args: ["test"] });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, "Hello, test!");

    assert.ok(instance);
    assert.equal(instance.activities.length, 1);
    assert.equal(instance.activities[0].name, "greet");
    assert.equal(instance.activities[0].args.length, 1);
    assert.equal(instance.activities[0].args[0], "test");
    assert.equal(instance.activities[0].result, "Hello, test!");
});

test("greet-workflow, undefined", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(greetWorkflow, { args: [undefined] });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, "Hello, undefined!");

    assert.ok(instance);
    assert.equal(instance.activities.length, 1);
    assert.equal(instance.activities[0].name, "greet");
    assert.equal(instance.activities[0].args.length, 1);
    assert.deepEqual(instance.activities[0].args[0], null);
});

test("greet-service-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(greetServiceWorkflow, { args: ["test"] });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, "Hello, test!");

    assert.ok(instance);
    assert.equal(instance.activities.length, 1);
    assert.equal(instance.activities[0].name, "GreetService.greet");
    assert.equal(instance.activities[0].args.length, 1);
    assert.deepEqual(instance.activities[0].args[0], "test");
    assert.equal(instance.activities[0].result, "Hello, test!");
});

test("test-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(testWorkflow, { workflowId: "test-42" });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, "test-42");

    assert.ok(instance);
    assert.equal(instance.instanceId, "test-42");
    assert.equal(instance.activities.length, 1);
    assert.deepEqual(instance.activities[0].args, []);
    assert.equal(instance.activities[0].result, "test-42");
});

test("increment-counter-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(incrementCounterWorkflow);
    let result = await handle.result();

    // Assert
    assert.equal(result, 1);
});

test("add-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(addWorkflow);
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, 3);

    assert.ok(instance);
    assert.equal(instance.activities.length, 1);
    assert.equal(instance.activities[0].args.length, 2);
    assert.equal(instance.activities[0].args[0], 1);
    assert.equal(instance.activities[0].args[1], 2);
    assert.equal(instance.activities[0].result, 3);
});

test("add-workflow args", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(addWorkflow, { args: [3, 4] });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

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

test("void-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(voidWorkflow, { workflowId: "void" });
    let result = await handle.result();

    handle = await worker.start(voidWorkflow, { workflowId: "void" });
    await handle.result();

    // Assert
    assert.equal(Counters.get("void"), 1);
});

test("timeout-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(timeoutWorkflow, {
        workflowId: "timeout",
        workflowExecutionTimeout: "1s",
    });

    await assert.rejects(async () => {
        await handle.result();
    }, "Expected timeout-workflow to throw");

    // Assert
    assert.equal(Counters.get("timeout-start"), 1);
    await sleep(5000);
    // Note: tests that activity execution is stopped
    assert.equal(Counters.get("timeout-end"), 0);

    let instance = await worker.store.getInstance(handle.workflowId);
    assert.ok(instance);
    assert.equal(instance.status, "timeout");
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
    assert.equal(Counters.get("no-timeout-start"), 1);
    assert.equal(Counters.get("no-timeout-end"), 1);

    let instance = await worker.store.getInstance(handle.workflowId);
    assert.ok(instance);
    assert.notEqual(instance.status, "timeout");
});

test("distance-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(distanceWorkflow, { workflowId: "distance" });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

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

test("move-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(moveWorkflow, { workflowId: "move" });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.deepEqual(result, { x: 0, y: 2 });

    assert.ok(instance);
    assert.equal(instance.activities.length, 2);
    assert.deepEqual(instance.activities[0].args[0], { x: 0, y: 0 });
    assert.deepEqual(instance.activities[1].args[0], { x: 0, y: 1 });
});

test("throw-error-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act & Assert
    const workflowId = "throw-error";
    try {
        console.log("D");
        let handle = await worker.start(throwErrorWorkflow, { workflowId });
        console.log("B");
        await handle.result();
        console.log("C");
        assert.fail();
    } catch {
        console.log("A");
        // Ignore, expected to throw
    }

    console.log("1");
    let instance = await worker.store.getInstance(workflowId);
    console.log("2");
    assert.ok(instance?.end, "Expected instance end to be set.");
    assert.deepEqual(instance.result, undefined, "Expected instance result to be undefined.");
    assert.ok(instance.error, "Expected error to be set");
    assert.ok(instance.error instanceof Error, "Expected error to be instance of Error");

    assert.ok(instance);
    assert.equal(instance.activities.length, 1);
    let activity = instance.activities[0];
    assert.deepEqual(activity.args[0], "Message 1");
    assert.ok(instance.end);
    assert.deepEqual(activity.result, undefined);
    assert.ok(activity.error, "Expected error to be set");
    assert.ok(activity.error instanceof Error, "Expected error to be instance of Error");

    assert.ok(activity.start instanceof Date);
    assert.ok(activity.end instanceof Date);
});

test("throw-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    let handle = await worker.start(throwWorkflow, { workflowId: "throw" });

    // Assert
    try {
        await handle.result();
    } catch (e) {
        assert.equal(typeof e, "string");
    }

    let instance = await worker.store.getInstance(handle.workflowId);
    assert.ok(instance);
    assert.ok(instance.end, "Expected instance end to be set.");
    assert.deepEqual(instance.result, undefined, "Expected instance result to be undefined.");
    assert.ok(instance.error, "Expected error to be set");
    assert.equal(typeof instance.error, "string", "Expected error to be string");
    assert.equal(instance.error, "Message 1");
});

test("call-twice-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(callTwiceWorkflow);
    let result = await handle.result();

    // Assert
    assert.equal(result, "ok");
});

test("no-store", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(noStore, { store: undefined });
    let result = await handle.result();

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.equal(result, "OK");
    assert.ok(!instance);
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
    assert.ok(parent !== undefined);
    assert.ok(child !== undefined);
    assert.ok(parent.start instanceof Date, "Expected workflow instance start to be Data");
    assert.ok(parent.end instanceof Date, "Expected workflow instance end to be Data");

    assert.ok(parent.start && parent.end);
    assert.ok(child.start && child.end);
    assert.ok(parent.start < child.start);
    assert.ok(parent.end > child.end);
});

test("long-workflow", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(longWorkflow, { workflowId: "long" });
    await handle.result();

    let large = await worker.store.getInstance("long");

    // Assert
    assert.ok(large !== undefined);
    assert.equal(large.activities.length, 125);
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
    assert.ok(large !== undefined);
    assert.equal(large.activities.length, 1);
    let activity = large.activities[0];
    const result = activity.result as Array<any>;
    assert.ok(result.length >= 10000);
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
    assert.ok(instance);
    assert.ok(instance.activities);
    assert.equal(instance.activities.length, 10);
});

test("greet-workflow-no-await-result", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(greetWorkflow, { args: ["test no await"] });
    await sleep("5s");

    let instance = await worker.store.getInstance(handle.workflowId);

    // Assert
    assert.ok(instance);
    assert.ok(instance.end, "Expected the workflow to have ended")
    assert.equal(instance.result, "Hello, test no await!");
});


test("now", async (t) => {
    // Arrange
    const worker = Worker.getInstance();

    // Act
    const handle = await worker.start(nowWorkflow, {
        store: new DurableFunctionsWorkflowHistoryStore({
            connectionString: "UseDevelopmentStorage=true",
            serializer: superjson
        }),
    });

    let result = await handle.result();

    let instance = await handle.store?.getInstance(handle.workflowId);

    // Assert
    assert.ok(result instanceof Date, "Expected result to be Date");
    assert.ok(instance);
    assert.ok(instance.result instanceof Date, "Expected result to be Date");
});