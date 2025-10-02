import { workflow } from "../../workflows/index.js";
import { MathService } from "../services/MathService.js";
import { math } from "../triggers/index.js";

export const addTwo = workflow({
    name: "add-two",
    description: "Adds 2 to argument.",
    trigger: math(),
    services: {
        math: new MathService(),
    },
    run: (services) => async (input: number) => {
        const output = await services.math.add(input, 2);
        return output;
    },
});
