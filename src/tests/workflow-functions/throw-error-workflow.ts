import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxy/proxyActivities.js";

const { throwErrorMessage } = proxyActivities(activities);

export async function throwErrorWorkflow(): Promise<42> {
    await throwErrorMessage("Message 1");
    await throwErrorMessage("Message 2");
    return 42;
}
