import { AsyncLocalStorage } from "async_hooks";
import { IWorkflowContext } from "./IWorkflowContext";
import { IWorkflowHistoryStore } from "./stores/IWorkflowHistoryStore";
import { MemoryWorkflowHistoryStore } from "./stores/MemoryWorkflowHistoryStore";
import { BaseWorkflowHandle, Workflow, WorkflowResultType, WorkflowReturnType } from "./Workflow";
import msPkg from "ms";
import { deserializeError, serializeError } from "./serialize-error";
import { Mutex } from "async-mutex";
import { sleep } from "./sleep";
import { IWorker, WorkflowStartOptions } from "./IWorker";

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

    public async start<T extends Workflow>(workflow: T, options?: WorkflowStartOptions<T>): Promise<BaseWorkflowHandle<T>> {
        let workflowId = "wf-id-" + Math.floor(Math.random() * 1000);
        if (options?.workflowId) {
            workflowId = options.workflowId;
        }

        let worker = Worker.getInstance();
        let store: IWorkflowHistoryStore | undefined = worker.store;
        if (options && Object.prototype.hasOwnProperty.call(options, "store")) {
            store = options.store;
        }

        let workflowContext: IWorkflowContext = {
            workflowId,
            store,
            log: (f: () => string) => {
                let log = worker.log;
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
            return Promise.reject(new Error(`Workflow ${workflowInstance.instanceId} timeout.`));
        }

        if (workflowInstance && Object.prototype.hasOwnProperty.call(workflowInstance, "result")) {
            workflowContext.log(() => `${workflowId}: skip (already executed)`);
            const result = workflowInstance.result;
            return {
                workflowId,
                store,
                result: async () => {
                    return result as Promise<WorkflowResultType<T>>;
                },
            };
        }

        if (workflowInstance && Object.prototype.hasOwnProperty.call(workflowInstance, "error")) {
            workflowContext.log(() => `${workflowId}: skip (error)`);
            const error = workflowInstance.error;
            return {
                workflowId,
                store,
                result: async () => {
                    let reason = deserializeError(error);
                    return Promise.reject(reason);
                },
            };
        }

        if (!workflowInstance) {
            workflowInstance = {
                instanceId: workflowId,
                args: options?.args || [],
                start: new Date(),
                activities: [],
            };

            await store?.setInstance(workflowInstance);
        }

        let promise: WorkflowReturnType = Worker.asyncLocalStorage.run(workflowContext, async () => {
            let result: any;
            let error: any;
            let isError = false;
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

            await workflowContext.mutex.runExclusive(async () => {
                if (!workflowInstance) {
                    throw new Error(`Expected workflow instance to be set.`);
                }
                if (store) {
                    const id = workflowInstance.instanceId;
                    workflowInstance = await store.getInstance(workflowInstance.instanceId);
                    if (!workflowInstance) {
                        throw new Error(`Workflow '${id}' not found in store.`);
                    }
                    if (workflowInstance?.status === "timeout") {
                        return Promise.reject(error);
                    }
                }

                workflowInstance.end = new Date();
                const duration = `${workflowInstance.end.getTime() - workflowInstance.start.getTime()} ms`;
                if (!isError) {
                    workflowContext.log(() => `${workflowId}: end (${duration})`);
                    workflowInstance.result = result;
                } else {
                    workflowContext.log(() => `${workflowId}: end (error, ${duration})`);
                    workflowInstance.error = serializeError(error);
                }

                if (store) {
                    await store.setInstance(workflowInstance);
                }
            });

            if (isError) {
                throw error;
            }
            return result;
        });

        if (options?.workflowExecutionTimeout) {
            let ms: number;
            if (typeof options.workflowExecutionTimeout === "string") {
                ms = msPkg(options.workflowExecutionTimeout);
            } else {
                ms = options.workflowExecutionTimeout;
            }

            let timeout = async () => {
                await sleep(ms);

                if (store && workflowInstance) {
                    workflowInstance = await store.getInstance(workflowInstance.instanceId);
                }

                if (workflowInstance?.end) {
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
                return Promise.reject(new Error(`Workflow ${workflowInstance?.instanceId} timeout.`));
            };

            promise = Promise.race([promise, timeout()]);
        }

        return {
            workflowId,
            store,
            result: async () => {
                return await promise;
            },
        };
    }
}