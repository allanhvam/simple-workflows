import { isDeepStrictEqual } from "node:util";
import { DefaultRetryPolicy } from "./DefaultRetryPolicy";
import { deserializeError, serializeError } from "./serialize-error";
import type { WorkflowActivity, WorkflowInstance } from "./stores/IWorkflowHistoryStore";
import { Worker } from "./Worker";

type PromiseFuncKeys<T> = {
    [K in keyof T]: T[K] extends ((...args: any[]) => Promise<any>) ? K : never;
}[keyof T];

type OnlyAsync<T> = Pick<T, PromiseFuncKeys<T>>;

export function proxyActivities<A extends object>(activities: A, options?: { retry?: number }): OnlyAsync<A> {
    return new Proxy(activities, {
        get(obj, activityType) {
            if (typeof activityType !== "string") {
                throw new TypeError(`Only strings are supported for Activity types, got: ${String(activityType)}`);
            }
            return async (...args: any[]) => {
                const f = activities[activityType];

                const context = Worker.asyncLocalStorage.getStore();
                if (!context) {
                    throw new Error("Workflow executed outside workflow context.");
                }
                const { workflowId, store, log, mutex } = context;

                const serializeArg = (arg: any): string | undefined => {
                    if (arg === undefined) {
                        return "undefined";
                    } else if (arg === null) {
                        return "null";
                    } else if (typeof arg === "number") {
                        return arg.toString();
                    } else if (typeof arg === "string" && arg.length < 36) {
                        return `"${arg}"`;
                    }
                    return undefined;
                };

                let logArgs = "()";
                if (args?.length === 1) {
                    const [arg] = args;
                    const serializedArg = serializeArg(arg);
                    if (serializedArg) {
                        logArgs = `(${serializedArg})`;
                    } else {
                        logArgs = "(...)";
                    }
                } else if (args?.length > 1) {
                    const serializedArg = serializeArg(args[0]);
                    if (serializedArg) {
                        logArgs = `(${serializedArg}, ...)`;
                    } else {
                        logArgs = "(...)";
                    }
                }

                let activityName = String(activityType);
                if (obj.constructor.name && obj.constructor.name !== "Object") {
                    activityName = `${obj.constructor.name}.${activityType}`;
                }
                const logPrefix = `${workflowId}/${activityName}${logArgs}`;

                log(() => `${logPrefix}: start`);

                // NOTE: if object is passed, make sure we have a copy of it, if it is changed later
                const originalArgs = structuredClone(args);

                const startActivity = await mutex.runExclusive(async (): Promise<WorkflowActivity | "timeout" | undefined> => {
                    const instance = await store?.getInstance(workflowId);
                    if (instance?.status === "timeout") {
                        return instance?.status;
                    }

                    const equal = store?.equal ?? isDeepStrictEqual;
                    let activity = instance?.activities.find(a => a.name === activityName && equal(a.args, originalArgs));

                    // If not executed yet
                    if (!activity) {
                        activity = {
                            name: activityName,
                            args: originalArgs,
                            start: new Date(),
                        };
                        instance?.activities.push(activity);
                        if (instance) {
                            await store?.setInstance(instance);
                        }
                    }

                    return activity;
                });

                if (startActivity === "timeout") {
                    log(() => `${logPrefix}: skip (timeout)`);
                    return;
                }

                let activity = startActivity;
                if (activity && Object.prototype.hasOwnProperty.call(activity, "result")) {
                    log(() => `${logPrefix}: skip (already executed)`);
                    return activity.result;
                } else if (activity && Object.prototype.hasOwnProperty.call(activity, "error")) {
                    log(() => `${logPrefix}: skip (error)`);
                    const reason = deserializeError(activity.error);
                    return await Promise.reject(reason);
                }

                let result: any;
                let error: any;
                let executions = 0;
                try {
                    if (options?.retry !== undefined && options?.retry > 0) {
                        const retryPolicy = new DefaultRetryPolicy(options.retry);
                        result = await retryPolicy.retry(() => {
                            executions++;
                            return f.bind(obj)(...args);
                        }, (e) => {
                            let message = `retry, execution #${executions} failed`;
                            if (e && typeof e === "object" && !e.stack && "toString" in e) {
                                message = `${message} (${e.toString()})`;
                            }
                            if (e && (typeof e === "string" || typeof e === "number")) {
                                message = `${message} (${String(e)})`;
                            }
                            log(() => `${logPrefix}: ${message}`);
                            if (e?.stack && typeof e.stack === "string") {
                                const stack = e.stack.split("\n");
                                stack.forEach((element: any) => {
                                    log(() => `${logPrefix}: ${element}`);
                                });
                            }
                        });
                    } else {
                        result = await f.bind(obj)(...args).catch((ex) => {
                            throw ex;
                        });
                    }
                } catch (e) {
                    error = e;
                }

                await mutex.runExclusive(async () => {
                    let instance: WorkflowInstance | undefined;
                    if (store) {
                        instance = await store.getInstance(workflowId);
                        const equal = store?.equal || isDeepStrictEqual;
                        activity = instance?.activities.find(a => a.name === activityName && equal(a.args, originalArgs));
                    }
                    if (!activity) {
                        throw new Error(`simple-workflows: Failed to find activity '${activityName}' on workflow '${workflowId}', could be a error in the store or serialization.`);
                    }
                    activity.end = new Date();
                    const duration = `${activity.end.getTime() - activity.start.getTime()} ms`;
                    if (error) {
                        activity.error = serializeError(error);
                        log(() => `${logPrefix}: end (error, ${executions > 1 ? `${executions} executions, ` : ""}${duration})`);
                    } else {
                        activity.result = result;
                        log(() => `${logPrefix}: end (${executions > 1 ? `${executions} executions, ` : ""}${duration})`);
                    }

                    if (store && instance) {
                        await store?.setInstance(instance);
                    }
                });

                if (error) {
                    return await Promise.reject(error);
                }
                return result;
            };
        },
    }) as any;
}
