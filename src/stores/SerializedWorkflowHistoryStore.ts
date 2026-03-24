import type { WorkflowInstance, GetInstancesOptions, GetInstancesResult } from "./IWorkflowHistoryStore.ts";
import type { ISerializer } from "../serialization/ISerializer.ts";
import { DefaultSerializer } from "../serialization/DefaultSerializer.ts";
import { isDeepStrictEqual } from "node:util";
import { WorkflowHistoryStore } from "./WorkflowHistoryStore.ts";

export abstract class SerializedWorkflowHistoryStore extends WorkflowHistoryStore {
    public readonly serializer: ISerializer;

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
