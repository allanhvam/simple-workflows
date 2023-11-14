
import { isDeepStrictEqual } from "util";
import { DefaultRetryPolicy } from "./DefaultRetryPolicy";
import { deserializeError, serializeError } from "./serialize-error";
import { WorkflowActivityInstance, WorkflowInstance } from "./stores/IWorkflowHistoryStore";
import { Worker } from "./Worker";

type PromiseFuncKeys<T> = {
    [K in keyof T]: T[K] extends ((...args: any[]) => Promise<any>) ? K : never;
}[keyof T]

type OnlyAsync<T> = Pick<T, PromiseFuncKeys<T>>;

export function proxyActivities<A extends object>(activities: A, options?: { retry?: number }): OnlyAsync<A> {
    return new Proxy(activities, {
        get(obj, activityType) {
            if (typeof activityType !== "string") {
                throw new TypeError(`Only strings are supported for Activity types, got: ${String(activityType)}`);
            }
            return async (...args: any[]) => {
                let f = activities[activityType];

                let context = Worker.asyncLocalStorage.getStore();
                if (!context) {
                    throw new Error(`Workflow executed outside workflow context.`);
                }
                let { workflowId, store, log, mutex } = context;

                let serializeArg = (arg: any): string => {
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
                    let [arg] = args;
                    let serializedArg = serializeArg(arg);
                    if (serializedArg) {
                        logArgs = `(${serializedArg})`;
                    } else {
                        logArgs = "(...)";
                    }
                } else if (args?.length > 1) {
                    let serializedArg = serializeArg(args[0]);
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
                let logPrefix = `${workflowId}/${activityName}${logArgs}`;

                log(() => `${logPrefix}: start`);

                // NOTE: if object is passed, make sure we have a copy of it, if it is changed later
                let originalArgs = structuredClone(args);

                let startActivity = await mutex.runExclusive(async (): Promise<WorkflowActivityInstance | "timeout"> => {
                    let instance = await store?.getInstance(workflowId);
                    if (instance?.status === "timeout") {
                        return instance?.status;
                    }

                    const equal = store?.equal || isDeepStrictEqual;
                    let activity = instance?.activities.find(a => a.name === activityName && equal(a.args, originalArgs));

                    // If not executed yet
                    if (!activity) {
                        activity = {
                            name: activityName,
                            args: originalArgs,
                            start: new Date(),
                        };
                        instance?.activities.push(activity);
                        await store?.setInstance(instance);
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
                    let reason = deserializeError(activity.error);
                    return Promise.reject(reason);
                }

                let result: any;
                let error: any;
                let executions = 0;
                try {
                    if (options?.retry > 0) {
                        let retryPolicy = new DefaultRetryPolicy(options.retry);
                        result = await retryPolicy.retry(() => {
                            executions++;
                            return f(...args);
                        }, (e) => {
                            let message = `retry, execution #${executions} failed`;
                            if (e && !e.stack && "toString" in e) {
                                message = `${message} (${e.toString()})`;
                            }
                            log(() => `${logPrefix}: ${message}`);
                            if (e?.stack && typeof e.stack === "string") {
                                const stack = e.stack.split("\n");
                                stack.forEach(element => {
                                    log(() => `${logPrefix}: ${element}`);
                                });
                            }
                        });
                    } else {
                        result = await f(...args);
                    }
                } catch (e) {
                    result = Promise.reject(e);
                    error = e;
                }

                await mutex.runExclusive(async () => {
                    let instance: WorkflowInstance = undefined;
                    if (store) {
                        instance = await store.getInstance(workflowId);
                        const equal = store?.equal || isDeepStrictEqual;
                        activity = instance?.activities.find(a => a.name === activityName && equal(a.args, originalArgs));
                    }
                    if (!activity) {
                        throw new Error(`simple-workflows: Failed to find activity '${activityName}' on workflow '${workflowId}', could be a error in the store or serialization.`);
                    }
                    activity.end = new Date();
                    if (error) {
                        activity.error = serializeError(error);
                        log(() => `${logPrefix}: end (error, ${executions > 1 ? `${executions} executions, ` : ""}${activity.end.getTime() - activity.start.getTime()} ms)`);
                    } else {
                        activity.result = result;
                        log(() => `${logPrefix}: end (${executions > 1 ? `${executions} executions, ` : ""}${activity.end.getTime() - activity.start.getTime()} ms)`);
                    }

                    if (store) {
                        await store?.setInstance(instance);
                    }
                });

                return result;
            };
        },
    }) as any;
}