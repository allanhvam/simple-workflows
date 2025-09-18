import { AsyncLocalStorage } from "async_hooks";
import { type IWorkflowContext } from "./IWorkflowContext.js";
import { type IWorkflowHistoryStore } from "../stores/IWorkflowHistoryStore.js";
import { MemoryWorkflowHistoryStore } from "../stores/MemoryWorkflowHistoryStore.js";
import { type WorkflowHandle, type WorkflowFunction, type WorkflowResultType } from "./WorkflowFunction.js";
import { Mutex } from "async-mutex";
import { sleep } from "../sleep.js";
import { type IWorker, type WorkflowStartOptions } from "./IWorker.js";
import { nanoid } from "nanoid";
import diagnostics_channel from "node:diagnostics_channel";
import { ms as msFunc } from "../ms.js";

const tracingChannel = diagnostics_channel.tracingChannel("simple-workflows");

export class Worker implements IWorker {
    public static asyncLocalStorage = new AsyncLocalStorage<IWorkflowContext>();
    private static instance: IWorker;

    public store: IWorkflowHistoryStore = new MemoryWorkflowHistoryStore();
    public log: ((s: string) => void) | undefined = undefined;

    private constructor() {
        // Private
    }

    public static getInstance(): IWorker {
        if (!Worker.instance) {
            Worker.instance = new Worker();
        }

        return Worker.instance;
    }

    public async start<T extends WorkflowFunction>(workflow: T, options?: WorkflowStartOptions<T>): Promise<WorkflowHandle<T>> {
        let workflowId = "workflow-" + nanoid();
        if (options?.workflowId) {
            workflowId = options.workflowId;
        }

        tracingChannel.start.publish({ workflowId });

        let asyncEndCalled = false;
        const asyncEndTracing = (error?: Error | any) => {
            if (asyncEndCalled) {
                return;
            }
            if (error) {
                tracingChannel.error.publish({ workflowId, error });
            }
            tracingChannel.asyncEnd.publish({ workflowId });
            asyncEndCalled = true;
        };

        const worker = Worker.getInstance();
        let store: IWorkflowHistoryStore | undefined = worker.store;
        if (options && Object.prototype.hasOwnProperty.call(options, "store")) {
            store = options.store;
        }

        const workflowContext: IWorkflowContext = {
            workflowId,
            store,
            log: (f: () => string) => {
                const log = worker.log;
                if (log) {
                    log(f());
                }
            },
            mutex: new Mutex(),
        };

        workflowContext.log(() => `${workflowId}: start`);

        let workflowInstance = await store?.getInstance(workflowId);
        if (workflowInstance?.status === "timeout") {
            workflowContext.log(() => `${workflowId}: skip (timeout)`);
            const error = new Error(`Workflow ${workflowInstance.instanceId} timeout.`);
            tracingChannel.error.publish({ workflowId, error });
            return await Promise.reject(error);
        }

        if (workflowInstance && Object.prototype.hasOwnProperty.call(workflowInstance, "result")) {
            workflowContext.log(() => `${workflowId}: skip (already executed)`);
            const result = workflowInstance.result;
            tracingChannel.end.publish({ workflowId });
            return {
                workflowId,
                store,
                result: async () => {
                    return await (result as Promise<WorkflowResultType<T>>);
                },
            };
        }

        if (workflowInstance && Object.prototype.hasOwnProperty.call(workflowInstance, "error")) {
            workflowContext.log(() => `${workflowId}: skip (error)`);
            const error = workflowInstance.error;
            tracingChannel.error.publish({ workflowId, error });
            return {
                workflowId,
                store,
                result: async () => {
                    const reason = error;
                    return await Promise.reject(reason);
                },
            };
        }

        if (!workflowInstance) {
            workflowInstance = {
                instanceId: workflowId,
                args: options?.args ?? [],
                start: new Date(),
                activities: [],
            };

            await store?.setInstance(workflowInstance);
        }

        let promise = Worker.asyncLocalStorage.run(workflowContext, async () => {
            let result: any;
            let error: any;
            let isError = false;

            tracingChannel.asyncStart.publish({ workflowId });

            try {
                if (options?.args) {
                    result = await workflow(...options?.args);
                } else {
                    result = await workflow();
                }
            } catch (e) {
                error = e;
                isError = true;
            }

            // Save workflow result in store
            await workflowContext.mutex.runExclusive(async () => {
                if (!workflowInstance) {
                    throw new Error("Expected workflow instance to be set.");
                }
                if (store) {
                    const id = workflowInstance.instanceId;
                    workflowInstance = await store.getInstance(workflowInstance.instanceId);
                    if (!workflowInstance) {
                        const error = new Error(`Workflow '${id}' not found in store.`);
                        throw error;
                    }
                    if (workflowInstance?.status === "timeout") {
                        return await Promise.reject(error);
                    }
                }

                workflowInstance.end = new Date();
                const duration = `${workflowInstance.end.getTime() - workflowInstance.start.getTime()} ms`;
                if (!isError) {
                    workflowContext.log(() => `${workflowId}: end (${duration})`);
                    workflowInstance.result = result;
                } else {
                    workflowContext.log(() => `${workflowId}: end (error, ${duration})`);
                    workflowInstance.error = error;
                }

                if (store) {
                    await store.setInstance(workflowInstance);
                }
            });

            asyncEndTracing(error);

            if (isError) {
                throw error;
            }
            return result;
        });

        if (options?.workflowExecutionTimeout) {
            let ms: number;
            if (typeof options.workflowExecutionTimeout === "string") {
                ms = msFunc(options.workflowExecutionTimeout);
            } else {
                ms = options.workflowExecutionTimeout;
            }

            const timeout = async (): Promise<undefined> => {
                await sleep(ms);

                if (store && workflowInstance) {
                    workflowInstance = await store.getInstance(workflowInstance.instanceId);
                }

                if (workflowInstance?.end) {
                    // If already ended
                    return;
                }

                await workflowContext.mutex.runExclusive(async () => {
                    if (store && workflowInstance) {
                        workflowInstance = await store.getInstance(workflowInstance.instanceId);
                    }
                    if (workflowInstance) {
                        workflowInstance.status = "timeout";
                        if (store) {
                            await store.setInstance(workflowInstance);
                        }
                    }
                });

                workflowContext.log(() => `${workflowId}: end (timeout)`);
                const error = new Error(`Workflow ${workflowInstance?.instanceId} timeout.`);

                asyncEndTracing(error);

                return await Promise.reject(error);
            };

            promise = Promise.race([promise, timeout()]);
        }

        tracingChannel.end.publish({ workflowId });

        return {
            workflowId,
            store,
            result: async () => {
                return await promise;
            },
        };
    }
}
