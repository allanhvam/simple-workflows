import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";

const { incrementCounter, getCounter } = proxyActivities(activities, {});

export async function incrementCounterWorkflow(): Promise<number> {
    await incrementCounter("counter");
    await incrementCounter("counter");
    return await getCounter("counter");
}
