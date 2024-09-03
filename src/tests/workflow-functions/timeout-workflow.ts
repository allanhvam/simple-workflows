import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxy/proxyActivities.js";
import { sleep } from "../../sleep.js";

const { incrementCounter } = proxyActivities(activities, {});

export async function timeoutWorkflow(): Promise<void> {
    await incrementCounter("timeout-start");
    await sleep("2s");
    await incrementCounter("timeout-end");
}
