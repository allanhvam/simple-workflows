import { AsyncLocalStorage } from "./AsyncLocalStorage";
import { IWorkflowContext } from "./IWorkflowContext";
import { IWorkflowHistoryStore } from "./stores/IWorkflowHistoryStore";
import { MemoryWorkflowHistoryStore } from "./stores/MemoryWorkflowHistoryStore";
import { BaseWorkflowHandle, Workflow, WorkflowReturnType } from "./Workflow";
import msPkg from "ms";
import { deserializeError, serializeError } from "./serialize-error";
import { Mutex } from "async-mutex";
import { sleep } from "./sleep";

export interface IWorker {
    store: IWorkflowHistoryStore;
    log?: (s: string) => void;
    start<T extends Workflow>(workflow: T, options?: WorkflowStartOptions<T>): Promise<BaseWorkflowHandle<T>>;
}

export declare type WithWorkflowArgs<W extends Workflow, T> = T & (Parameters<W> extends [any, ...any[]] ? {
    /**
     * Arguments to pass to the Workflow
     */
    args: Parameters<W>;
} : {
    /**
     * Arguments to pass to the Workflow
     */
    args?: Parameters<W>;
});

export declare type WorkflowOptions = {
    workflowId?: string,
    /**
     * @format {@link https://www.npmjs.com/package/ms | ms} formatted string or number of milliseconds
     */
    workflowExecutionTimeout?: string | number;
    /**
     * Store for the workflow instance, overwrites the global instance (if set)
     */
    store?: IWorkflowHistoryStore;
}

export declare type WorkflowStartOptions<T extends Workflow = Workflow> = WithWorkflowArgs<T, WorkflowOptions>;

export class Worker implements IWorker {
    public static asyncLocalStorage: AsyncLocalStorage = new AsyncLocalStorage();
    private static instance: IWorker;

    public store: IWorkflowHistoryStore = new MemoryWorkflowHistoryStore();
    public log: (s: string) => void = undefined;

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

        let store = Worker.getInstance().store;
        if (options && Object.prototype.hasOwnProperty.call(options, "store")) {
            store = options.store;
        }

        let workflowContext: IWorkflowContext = {
            workflowId,
            store,
            log: (f: () => string) => {
                let log = Worker.getInstance().log;
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
            return {
                workflowId,
                result: async () => {
                    return workflowInstance.result;
                },
            };
        }

        if (workflowInstance && Object.prototype.hasOwnProperty.call(workflowInstance, "error")) {
            workflowContext.log(() => `${workflowId}: skip (error)`);
            return {
                workflowId,
                result: async () => {
                    return Promise.reject(deserializeError(workflowInstance.error));
                },
            };
        }

        if (!workflowInstance) {
            workflowInstance = {
                instanceId: workflowId,
                args: options?.args,
                start: new Date(),
                activities: [],
            };

            await store?.setInstance(workflowInstance);
        }

        let promise: WorkflowReturnType = Worker.asyncLocalStorage.run<ReturnType<T>>(workflowContext, async () => {
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
                if (store) {
                    workflowInstance = await store.getInstance(workflowInstance.instanceId);
                    if (workflowInstance.status === "timeout") {
                        return Promise.reject(error);
                    }
                }

                workflowInstance.end = new Date();
                if (!isError) {
                    workflowContext.log(() => `${workflowId}: end (${workflowInstance.end.getTime() - workflowInstance.start.getTime()} ms)`);
                    workflowInstance.result = result;
                } else {
                    workflowContext.log(() => `${workflowId}: end (error, ${workflowInstance.end.getTime() - workflowInstance.start.getTime()} ms)`);
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

                if (store) {
                    workflowInstance = await store.getInstance(workflowInstance.instanceId);
                }

                if (workflowInstance.end) {
                    return;
                }

                await workflowContext.mutex.runExclusive(async () => {
                    if (store) {
                        workflowInstance = await store.getInstance(workflowInstance.instanceId);
                    }
                    workflowInstance.status = "timeout";
                    if (store) {
                        store.setInstance(workflowInstance);
                    }
                });

                workflowContext.log(() => `${workflowId}: end (timeout)`);
                return Promise.reject(new Error(`Workflow ${workflowInstance.instanceId} timeout.`));
            };

            promise = Promise.race([promise, timeout()]);
        }

        return {
            workflowId,
            result: async () => {
                return await promise;
            },
        };
    }
}