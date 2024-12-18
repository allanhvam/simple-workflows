import { Worker as WorkflowWorker } from "../worker/Worker.js";
import { proxyActivities } from "../proxy/proxyActivities.js";
import { type OnlyAsync } from "../types/OnlyAsync.js";
import { nanoid } from "nanoid";
import { type WorkflowHandle } from "../worker/WorkflowFunction.js";

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
    trigger: Trigger<P>;
    services?: S;
    run: (services: Services<S>) => (triggerData: P) => Promise<O>;
};

export const workflows = new Map<string, Workflow<any, any>>();

export const workflow = <S extends Record<string, object>, P = void, O = unknown>(workflow: Workflow<S, P, O>) => {
    workflows.set(workflow.name, workflow);

    const runInternal = async (id: string, services: S | undefined, triggerData: P) => {
        // Proxy services
        const proxies = {} as any;
        if (services) {
            Object.keys(services).forEach((key) => {
                proxies[key] = proxyActivities(services[key], { retry: 5 });
            });
        }

        const worker = WorkflowWorker.getInstance();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const handle = await worker.start(workflow.run(proxies), {
            workflowId: `${workflow.name} ${id}`,
            args: [triggerData],
        });
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

            await workflow.trigger.start(workflow, run);
        },
        /**
         * Run workflow
         */
        run: (services: S) => async (triggerData: P) => {
            const handle = await runInternal(nanoid(), services, triggerData);
            return await handle.result();
        },
        /**
         * Invoke workflow with trigger data
         */
        invoke: async (triggerData: P) => {
            const handle = await runInternal(nanoid(), workflow.services, triggerData);
            return await handle.result();
        },
    };
};
