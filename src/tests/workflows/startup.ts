import { startup as startupTrigger } from "../../triggers/startup.js";
import { workflow } from "../../workflows/index.js";

export const startup = workflow({
    name: "startup",
    description: "Test for startup trigger.",
    trigger: startupTrigger(),
    run: () => async () => {
    },
});
