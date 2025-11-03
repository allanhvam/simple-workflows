import { test } from "node:test";
import assert from "node:assert";
import { workflow } from "../workflows/index.js";

void test("Workflow throws", async () => {
    // Arrange
    const w = workflow({
        name: "workflow-throws",
        services: {
            service: {
                f: async (arg: unknown) => {
                    return arg;
                },
            },
        },
        run: (services) => async () => {
            const { service } = services;

            await service.f(() => { });
        },
    });

    // Act and Assert
    try {
        await w.invoke();
    } catch (e) {
        if (e && typeof e === "object" && "message" in e && typeof e.message === "string") {
            assert.ok(e.message.includes("simple-workflows: Failed to clone argument for workflow"));
            return;
        }
        assert.fail();
    }
    assert.fail();
});
