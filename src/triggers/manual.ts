import type { Trigger } from "../workflows/index.js";

export const manual = () => {
    return {
        name: "manual",
        options: undefined,
        start: (workflow: { name: string }) => {
            console.log(`manual: trigger start for ${workflow.name}`);
        },
        stop: (workflow: { name: string }) => {
            console.log(`manual: trigger stop for ${workflow.name}`);
        },
    } satisfies Trigger<void>;
};
