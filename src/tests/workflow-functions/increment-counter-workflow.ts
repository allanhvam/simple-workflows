import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxy/proxyActivities.js";

const { incrementCounter, getCounter } = proxyActivities(activities, {});

export async function incrementCounterWorkflow(): Promise<number> {
    await incrementCounter("counter");
    await incrementCounter("counter");
    return await getCounter("counter");
}
