import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxyActivities.js";

const { throwMessage } = proxyActivities(activities);

export async function throwWorkflow(): Promise<42> {
    await throwMessage("Message 1");
    await throwMessage("Message 2");
    return 42;
}
