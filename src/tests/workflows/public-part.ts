import { manual } from "../../triggers/manual.ts";
import { WorkflowContext } from "../../worker/WorkflowContext.ts";
import { workflow } from "../../workflows/index.ts";

class MathService {
  private z = async () => {
    return Promise.resolve(1);
  };

  public add = async (x: number, y: number) => {
    return Promise.resolve(x + y + await this.z());
  };
}

export const publicPart = workflow({
  name: "public-part",
  description: "Workflow for testing PublicPart returns.",
  trigger: manual(),
  services: {
    math: new MathService(),
  },
  run: ({ math }) => async () => {
    return {
      id: WorkflowContext.current()?.workflowId,
      result: await math.add(1, 2),
    };
  },
});
