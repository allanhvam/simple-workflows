import { IWorkflowContext } from "./IWorkflowContext";

const als = require("async-local-storage");

// TODO: 
// Move to standard when newer version of NodeJS
// https://nodejs.org/docs/latest-v14.x/api/async_hooks.html#async_hooks_class_asynclocalstorage
export class AsyncLocalStorage {
    constructor() {
        als.enable();
    }

    run<T>(store: IWorkflowContext, f: () => Promise<T>): Promise<T> {
        als.scope();
        als.set("context", store);

        return f();
    }

    getContext(): IWorkflowContext {
        return als.get("context");
    }
}