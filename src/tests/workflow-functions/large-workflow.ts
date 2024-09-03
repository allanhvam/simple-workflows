import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxy/proxyActivities.js";

const { greet } = proxyActivities(activities, {});

export async function largeWorkflow(long: string): Promise<string> {
    return await greet(long);
}
