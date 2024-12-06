import type { Trigger } from "../workflows/index.js";

export const startup = () => {
    return {
        name: "startup",
        options: undefined,
        description: "Trigger runs on application startup",
        start: async (_, run) => {
            const id = new Date().getTime().toString();
            void run(id);
            return await Promise.resolve();
        },
        stop: () => {
        },
    } satisfies Trigger<void>;
};
