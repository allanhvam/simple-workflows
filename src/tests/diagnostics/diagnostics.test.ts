import { test } from "node:test";
import assert from "node:assert";
import { Worker } from "../../worker/Worker.js";
import { DurableFunctionsWorkflowHistoryStore } from "../../stores/index.js";
import { throwErrorWorkflow } from "../workflow-functions/throw-error-workflow.js";
import diagnostics_channel from "node:diagnostics_channel";

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

void test("diagnostics channel, error", async (t) => {
    // Arrange
    type Message = (object & {
        error?: unknown;
        result?: unknown;
    }) | undefined;
    let startMessage: object | undefined;
    let endMessage: Message;
    let asyncStartMessage: Message;
    let asyncEndMessage: Message;
    let errorMessage: (object & {
        error: unknown;
    }) | undefined;

    const tracingChannel = diagnostics_channel.tracingChannel("simple-workflows");

    tracingChannel.subscribe({
        start(message) {
            startMessage = message;
        },
        end(message) {
            endMessage = message;
        },
        asyncStart(message) {
            asyncStartMessage = message;
        },
        asyncEnd(message) {
            asyncEndMessage = message;
        },
        error(message) {
            errorMessage = message;
        },
    });

    const workflowId = "test-diagnostics";
    const worker = Worker.getInstance();

    const handle = await worker.start(throwErrorWorkflow, { workflowId });

    // Act
    try {
        await handle.result();
    } catch (e) {
        assert(e instanceof Error);
    }

    // Assert
    assert.ok(startMessage);
    assert.ok(endMessage);
    assert.ok(asyncStartMessage);
    assert.ok(asyncEndMessage);
    assert.ok(errorMessage);
    assert.equal("workflowId" in errorMessage ? errorMessage.workflowId : undefined, "test-diagnostics");
    assert.ok(errorMessage.error);
});
