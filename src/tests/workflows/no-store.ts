import { WorkflowContext } from "../../WorkflowContext";

export async function noStore(): Promise<string> {
    const store = WorkflowContext.current()?.store;
    if (store) {
        return await Promise.reject(new Error("Expected store to be undefined."));
    }

    return await Promise.resolve("OK");
}
