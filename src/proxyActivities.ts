
import { DefaultRetryPolicy } from "./DefaultRetryPolicy";
import { deserializeError, serializeError } from "./serialize-error";
import { IWorkflowActivityInstance, IWorkflowInstance } from "./stores/IWorkflowHistoryStore";
import { Worker } from "./Worker";

interface ActivityFunction<P extends any[], R> {
    (...args: P): Promise<R>;
}

declare type ActivityInterface = Record<string, ActivityFunction<any[], any>>;

export function proxyActivities<A extends ActivityInterface>(activities: A, options?: { retry?: number }): A {
    return new Proxy({}, {
        get(_, activityType) {
            if (typeof activityType !== "string") {
                throw new TypeError(`Only strings are supported for Activity types, got: ${String(activityType)}`);
            }
            return async (...args: any[]) => {
                let f = activities[activityType];

                let context = Worker.asyncLocalStorage.getContext();
                if (!context) {
                    throw new Error(`Workflow executed outside workflow context.`);
                }
                let { workflowId, store, log, mutex } = context;

                let serializeArg = (arg: any): string => {
                    if (typeof arg === "number") {
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
                let logPrefix = `${workflowId}/${activityType}${logArgs}`;

                log(() => `${logPrefix}: start`);

                // Node.js v11 change to https://developer.mozilla.org/en-US/docs/Web/API/structuredClone
                // NOTE: if object is passed, make sure we have a copy of it, if it is changed later
                let originalArgs = JSON.stringify(args);

                let startActivity = await mutex.runExclusive(async (): Promise<IWorkflowActivityInstance | "timeout"> => {
                    let instance = await store?.getInstance(workflowId);
                    if (instance?.status === "timeout") {
                        return instance?.status;
                    }
                    let activity = instance?.activities.find(a => a.name === activityType && JSON.stringify(a.args) === originalArgs);

                    // If not executed yet
                    if (!activity) {
                        activity = {
                            name: activityType,
                            args: JSON.parse(originalArgs),
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
                    return Promise.reject(deserializeError(activity.error));
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
                        }, () => {
                            log(() => `${logPrefix}: retry`);
                        });
                    } else {
                        result = await f(...args);
                    }
                } catch (e) {
                    result = Promise.reject(e);
                    error = e;
                }

                await mutex.runExclusive(async () => {
                    let instance: IWorkflowInstance = undefined;
                    if (store) {
                        instance = await store?.getInstance(workflowId);
                        activity = instance?.activities.find(a => a.name === activityType && JSON.stringify(a.args) === originalArgs);
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