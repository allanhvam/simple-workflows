import { proxyActivities } from "../../proxyActivities.js";
import { StateService } from "../services/StateService.js";

const stateService = proxyActivities(new StateService());

export async function stateServiceWorkflow(state: string): Promise<string> {
    await stateService.set(state);
    return await stateService.get();
}
