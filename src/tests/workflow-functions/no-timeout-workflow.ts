import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxy/proxyActivities.js";
import { sleep } from "../../sleep.js";

const { incrementCounter } = proxyActivities(activities, {});

export async function noTimeoutWorkflow(): Promise<void> {
    await incrementCounter("no-timeout-start");
    await sleep("500ms");
    await incrementCounter("no-timeout-end");
}
