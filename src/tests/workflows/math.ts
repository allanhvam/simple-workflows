import { manual } from "../../triggers/manual.ts";
import { workflow } from "../../workflows/index.ts";
import { MathService } from "../services/MathService.ts";

export const math = workflow({
    name: "math",
    description: "Perform basic mathematical operations.",
    trigger: manual(),
    services: {
        math: new MathService(),
    },
    run: (services) => async () => {
        return await services.math.add(1, 2);
    },
});
