import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { incrementCounter, getCounter } = proxyActivities(activities, {});

export async function incrementCounterWorkflow(): Promise<number> {
    await incrementCounter("counter");
    await incrementCounter("counter");
    return await getCounter("counter");
}
