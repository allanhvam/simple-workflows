import { nanoid } from "nanoid";
import type { Trigger } from "../workflows/index.js";

export const startup = () => {
    return {
        name: "startup",
        options: undefined,
        description: "Trigger runs on application startup",
        start: async (workflow: { name: string }, run: (id: string, _: any) => Promise<void>) => {
            const id = new Date().getTime().toString();
            void run(id, undefined);
            return Promise.resolve();
        },
        stop: (workflow: { name: string }) => {
        },
    } satisfies Trigger<void>;
};
