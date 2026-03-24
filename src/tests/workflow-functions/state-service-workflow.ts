import { proxyActivities } from "../../proxy/proxyActivities.ts";
import { StateService } from "../services/StateService.ts";

const stateService = proxyActivities(new StateService());

export async function stateServiceWorkflow(state: string): Promise<string> {
    await stateService.set(state);
    return await stateService.get();
}
