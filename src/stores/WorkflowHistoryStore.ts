import type { IWorkflowHistoryStore, WorkflowInstance, GetInstancesOptions, GetInstancesResult, WorkflowInstanceHeader } from "./IWorkflowHistoryStore.js";

export abstract class WorkflowHistoryStore implements IWorkflowHistoryStore {
    protected getWorkflowInstanceHeaders = async (instances: Array<WorkflowInstance>, options?: GetInstancesOptions): GetInstancesResult => {
        let headers = instances.map(this.getWorkflowInstanceHeader);

        const from = options?.filter?.from;
        if (from) {
            headers = headers.filter(header => header.start >= from);
        }

        const to = options?.filter?.to;
        if (to) {
            headers = headers.filter(header => header.start < to);
        }

        headers.sort((a, b) => a.start.getTime() - b.start.getTime());

        if (options?.continuationToken) {
            const index = headers.findIndex(header => header.instanceId === options.continuationToken);
            if (index) {
                headers = headers.slice(index);
            }
        }

        let continuationToken: string | undefined;
        const pageSize = options?.pageSize;
        if (pageSize) {
            if (headers.length > pageSize) {
                continuationToken = headers[pageSize].instanceId;
            }
            headers = headers.slice(0, pageSize);
        }

        return {
            instances: headers,
            continuationToken,
        };
    };

    protected getWorkflowInstanceHeader = (instance: WorkflowInstance): WorkflowInstanceHeader => {
        return {
            instanceId: instance.instanceId,
            status: instance.status,
            start: instance.start,
            end: instance.end,
            error: !!instance.error,
        };
    };

    abstract equal: (val1: any, val2: any) => boolean;
    abstract getInstance: (id: string) => Promise<WorkflowInstance | undefined>;
    abstract setInstance: (instance: WorkflowInstance) => Promise<void>;
    abstract removeInstance: (id: string) => Promise<void>;

    abstract getInstances: (options?: GetInstancesOptions) => GetInstancesResult;
};
