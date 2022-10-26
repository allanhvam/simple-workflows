import { WorkflowContext } from "../../WorkflowContext";

export async function noStore(): Promise<string> {
    let store = WorkflowContext.current().store;
    if (store) {
        return Promise.reject(new Error("Expected store to be undefined."));
    }

    return Promise.resolve("OK");
}
