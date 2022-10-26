import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";
import { sleep } from "../../sleep";

const { incrementCounter } = proxyActivities(activities, {});

export async function noTimeoutWorkflow(): Promise<void> {
    await incrementCounter("no-timeout-start");
    await sleep("500ms");
    await incrementCounter("no-timeout-end");
}
