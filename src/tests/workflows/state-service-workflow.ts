import { proxyActivities } from "../../proxyActivities";
import { StateService } from "../services/StateService";

const stateService = proxyActivities(new StateService());

export async function stateServiceWorkflow(state: string): Promise<string> {
    await stateService.set(state);
    return await stateService.get();
}
