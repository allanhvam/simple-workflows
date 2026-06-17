import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";

const { throwErrorMessage } = proxyActivities(activities);

export async function throwErrorWorkflow(): Promise<42> {
    await throwErrorMessage("Message 1");
    await throwErrorMessage("Message 2");
    return 42;
}
