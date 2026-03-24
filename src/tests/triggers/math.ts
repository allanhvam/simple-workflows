import type { Trigger } from "../../index.ts";

export const math = () => {
    return {
        name: "math",
        options: undefined,
        start: (workflow: { name: string }) => {
            console.log(`math: trigger start for ${workflow.name}`);
        },
        stop: (workflow: { name: string }) => {
            console.log(`math: trigger stop for ${workflow.name}`);
        },
    } satisfies Trigger<number, number>;
};
