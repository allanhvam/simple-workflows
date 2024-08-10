import { WorkflowContext } from "../../WorkflowContext.js";

export async function noStore(): Promise<string> {
    const store = WorkflowContext.current()?.store;
    if (store) {
        return await Promise.reject(new Error("Expected store to be undefined."));
    }

    return await Promise.resolve("OK");
}
