import { type IWorkflowHistoryStore, type WorkflowInstance, type WorkflowInstanceHeader } from "./IWorkflowHistoryStore";
import { type ISerializer } from "../ISerializer";
import { DefaultSerializer } from "../DefaultSerializer";
import { isDeepStrictEqual } from "node:util";

export abstract class SerializedWorkflowHistoryStore implements IWorkflowHistoryStore {
    protected readonly serializer: ISerializer;

    public constructor(serializer?: ISerializer) {
        this.serializer = serializer ?? new DefaultSerializer();
    }

    public equal = (val1: any, val2: any): boolean => {
        return (this.serializer.equal ?? isDeepStrictEqual)(val1, val2);
    };

    abstract getInstance: (id: string) => Promise<WorkflowInstance | undefined>;
    abstract setInstance: (instance: WorkflowInstance) => Promise<void>;
    abstract getInstances: () => Promise<WorkflowInstance[]>;
    abstract getInstanceHeaders: () => Promise<WorkflowInstanceHeader[]>;
    abstract removeInstance: (id: string) => Promise<void>;
}
