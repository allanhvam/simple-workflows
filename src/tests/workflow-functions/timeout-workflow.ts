import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";
import { sleep } from "../../sleep.ts";

const { incrementCounter } = proxyActivities(activities, {});

export async function timeoutWorkflow(): Promise<void> {
    await incrementCounter("timeout-start");
    await sleep("2s");
    await incrementCounter("timeout-end");
}
