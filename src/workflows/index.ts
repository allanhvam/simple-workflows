import { Worker as WorkflowWorker } from "../worker/Worker.js";
import { proxyActivities } from "../proxy/proxyActivities.js";
import { type OnlyAsync } from "../types/OnlyAsync.js";
import { nanoid } from "nanoid";
import { type WorkflowHandle } from "../worker/WorkflowFunction.js";
import { manual } from "../triggers/manual.js";
import type { WorkflowOptions } from "../worker/IWorker.js";

// P: Payload
// O: Output
export type Trigger<P, O = unknown> = {
    name: string,
    options: any,
    description?: string,
    start: (workflow: any, run: (id: string, triggerData: P) => Promise<WorkflowHandle<(triggerData: P) => Promise<O>> | undefined>) => void | Promise<void>;
    stop?: (workflow: any) => void | Promise<void>;
};

export type Services<T> = { [P in keyof T]: OnlyAsync<T[P]> };

export type Workflow<S extends Record<string, object>, P = void, O = unknown> = {
    name: string;
    description?: string;
    tags?: Array<string>;
    disabled?: boolean;
    // Default trigger is manual
    trigger?: Trigger<P>;
    services?: S;
    store?: WorkflowOptions["store"];
    executionTimeout?: WorkflowOptions["workflowExecutionTimeout"];
    run: (services: Services<S>) => (triggerData: P) => Promise<O>;
};

type WorkflowsMapValue =
    Omit<Workflow<any, any>, "trigger"> &
    Required<Pick<Workflow<any, any>, "trigger">>;

export const workflows = new Map<string, WorkflowsMapValue>();

export const workflow = <S extends Record<string, object>, P = void, O = unknown>(workflow: Workflow<S, P, O>) => {
    if (!workflow.trigger) {
        workflow.trigger = manual();
    }
    workflows.set(workflow.name, workflow as WorkflowsMapValue);

    const runInternal = async (id: string, services: S | undefined, triggerData: P) => {
        // Proxy services
        const proxies = {} as any;
        if (services) {
            Object.keys(services).forEach((key) => {
                proxies[key] = proxyActivities(services[key], { retry: 5 });
            });
        }

        const worker = WorkflowWorker.getInstance();

        type Options = Parameters<typeof worker.start>[1];
        const options: Options = {
            workflowId: `${workflow.name} ${id}`,
            args: [triggerData],
        };
        if (Object.prototype.hasOwnProperty.call(workflow, "store")) {
            options.store = workflow.store;
        }
        if (workflow.executionTimeout) {
            options.workflowExecutionTimeout = workflow.executionTimeout;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const handle = await worker.start(workflow.run(proxies), options as any);
        return handle;
    };

    return {
        name: workflow.name,
        description: workflow.description,
        tags: workflow.tags,
        /**
         * Start the workflow trigger
         */
        start: async () => {
            const run = async (id: string, payload: P) => {
                const worker = WorkflowWorker.getInstance();
                if (workflow.disabled) {
                    worker.log?.(`Workflow '${workflow.name}' disabled, skip`);
                    return;
                }
                return await runInternal(id, workflow.services, payload);
            };

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            await workflow.trigger!.start(workflow, run);
        },
        /**
         * Run workflow
         */
        run: (services: S) => async (triggerData: P) => {
            const handle = await runInternal(nanoid(), services, triggerData);
            return await handle.result();
        },
        /**
         * Invoke workflow with trigger data, returns the result
         */
        invoke: async (triggerData: P) => {
            const handle = await runInternal(nanoid(), workflow.services, triggerData);
            return await handle.result();
        },
    };
};
