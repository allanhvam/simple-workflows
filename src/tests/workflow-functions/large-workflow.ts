import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";

const { greet } = proxyActivities(activities, {});

export async function largeWorkflow(long: string): Promise<string> {
    return await greet(long);
}
