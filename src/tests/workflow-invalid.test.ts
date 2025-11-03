import { test } from "node:test";
import assert from "node:assert";
import { Worker } from "../worker/Worker.js";
import { MemoryWorkflowHistoryStore } from "../stores/index.js";
import { workflow } from "../workflows/index.js";

test.before(async () => {
    const worker = Worker.getInstance();
    worker.log = (s: string) => console.log(`[${new Date().toISOString()}] ${s}`);
});

void test("Workflow service undefined", async () => {
    // Arrange

    const w = workflow({
        name: "test-workflow-service-undefined",
        services: {
            service: undefined as any as { add: (x: number, y: number) => Promise<number> },
        },
        run: ({service}) => async () => {
            await service.add(1, 2);
        },
    });

    try {
        // Act
        await w.invoke();
    } catch (e) {
        // Assert
        if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
            assert.ok(e.message.includes("simple-workflows: Cannot create proxy with a non-object as target or handler"));
            return;
        }
        assert.fail();
    }
});

void test("Workflow f undefined", async () => {
    // Arrange
    const store = new MemoryWorkflowHistoryStore();

    const w = workflow({
        name: "test-workflow-f-undefined",
        store,
        services: {
            service: {} as { add: (x: number, y: number) => Promise<number> },
        },
        run: ({service}) => async () => {
            await service.add(1, 2);
        },
    });

    try {
        // Act
        await w.invoke();
    } catch (e) {
        // Assert
        if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
            assert.ok(e.message.includes("simple-workflows: Object.add is not a function"));
            return;
        }
        assert.fail();
    }
});
