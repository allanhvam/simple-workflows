import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";

const { now } = proxyActivities(activities, {});

export async function nowWorkflow(): Promise<Date> {
    return await now();
}
