import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { incrementCounter } = proxyActivities(activities, {});

export async function voidWorkflow(): Promise<void> {
    await incrementCounter("void");
}
