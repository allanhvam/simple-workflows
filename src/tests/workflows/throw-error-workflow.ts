import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { throwErrorMessage } = proxyActivities(activities);

export async function throwErrorWorkflow(): Promise<42> {
    await throwErrorMessage("Message 1");
    await throwErrorMessage("Message 2");
    return 42;
}
