import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxyActivities.js";

const { now } = proxyActivities(activities, {});

export async function nowWorkflow(): Promise<Date> {
    return await now();
}
