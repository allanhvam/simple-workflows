import type { WorkflowInstance, GetInstancesOptions, GetInstancesResult } from "./IWorkflowHistoryStore";
import type { ISerializer } from "../ISerializer";
import { DefaultSerializer } from "../DefaultSerializer";
import { isDeepStrictEqual } from "node:util";
import { WorkflowHistoryStore } from "./WorkflowHistoryStore";

export abstract class SerializedWorkflowHistoryStore extends WorkflowHistoryStore {
    protected readonly serializer: ISerializer;

    public constructor(serializer?: ISerializer) {
        super();
        this.serializer = serializer ?? new DefaultSerializer();
    }

    public equal = (val1: any, val2: any): boolean => {
        return (this.serializer.equal ?? isDeepStrictEqual)(val1, val2);
    };

    abstract getInstance: (id: string) => Promise<WorkflowInstance | undefined>;
    abstract setInstance: (instance: WorkflowInstance) => Promise<void>;
    abstract removeInstance: (id: string) => Promise<void>;

    abstract getInstances: (options?: GetInstancesOptions) => GetInstancesResult;
};
