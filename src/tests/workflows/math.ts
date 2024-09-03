import { manual } from "../../triggers/manual.js";
import { workflow } from "../../workflows/index.js";
import { add } from "../activities/add.js";
import { MathService } from "../services/MathService.js";

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
})