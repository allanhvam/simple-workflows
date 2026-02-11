import { manual } from "../../triggers/manual.js";
import { WorkflowContext } from "../../worker/WorkflowContext.js";
import { workflow } from "../../workflows/index.js";

interface Math {
  add: (x: number, y: number) => PromiseLike<number>;
}

class MathService implements Math {
  public add = (x: number, y: number) => {
    return Promise.resolve(x + y);
  };
}

export const promiseLike = workflow({
  name: "promise-like",
  description: "Workflow for testing PromiseLike returns.",
  trigger: manual(),
  services: {
    math: new MathService() as Math,
  },
  run: (services) => async () => {
    return {
      id: WorkflowContext.current()?.workflowId,
      result: await services.math.add(1, 2),
    };
  },
});
