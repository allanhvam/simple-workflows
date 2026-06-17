import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";
import { sleep } from "../../sleep.ts";

const { incrementCounter } = proxyActivities(activities, {});

export async function noTimeoutWorkflow(): Promise<void> {
    await incrementCounter("no-timeout-start");
    await sleep("500ms");
    await incrementCounter("no-timeout-end");
}
