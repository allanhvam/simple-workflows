import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxy/proxyActivities.js";

const { incrementCounter } = proxyActivities(activities, {});

export async function voidWorkflow(): Promise<void> {
    await incrementCounter("void");
}
