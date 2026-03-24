import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";

const { incrementCounter } = proxyActivities(activities, {});

export async function voidWorkflow(): Promise<void> {
    await incrementCounter("void");
}
