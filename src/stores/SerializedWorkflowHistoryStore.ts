import type { WorkflowInstance, GetInstancesOptions, GetInstancesResult } from "./IWorkflowHistoryStore.js";
import type { ISerializer } from "../ISerializer.js";
import { DefaultSerializer } from "../DefaultSerializer.js";
import { isDeepStrictEqual } from "node:util";
import { WorkflowHistoryStore } from "./WorkflowHistoryStore.js";

export abstract class SerializedWorkflowHistoryStore extends WorkflowHistoryStore {
    protected readonly serializer: ISerializer;

    public constructor(serializer?: ISerializer) {
        super();
        this.serializer = serializer ?? new DefaultSerializer();
    }

    public equal = (val1: any, val2: any): boolean => {
        return (this.serializer.equal ?? isDeepStrictEqual)(val1, val2);
    };

    abstract override getInstance: (id: string) => Promise<WorkflowInstance | undefined>;
    abstract override setInstance: (instance: WorkflowInstance) => Promise<void>;
    abstract override removeInstance: (id: string) => Promise<void>;

    abstract override getInstances: (options?: GetInstancesOptions) => GetInstancesResult;
};
