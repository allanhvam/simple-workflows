import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";
import { sleep } from "../../sleep";

const { incrementCounter } = proxyActivities(activities, {});

export async function timeoutWorkflow(): Promise<void> {
    await incrementCounter("timeout-start");
    await sleep("2s");
    await incrementCounter("timeout-end");
}
