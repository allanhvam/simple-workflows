import { workflow } from "../../workflows/index.ts";
import { MathService } from "../services/MathService.ts";
import { math } from "../triggers/index.ts";

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
