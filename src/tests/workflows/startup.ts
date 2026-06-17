import { startup as startupTrigger } from "../../triggers/startup.ts";
import { workflow } from "../../workflows/index.ts";

export const startup = workflow({
    name: "startup",
    description: "Test for startup trigger.",
    trigger: startupTrigger(),
    run: () => async () => {
    },
});
