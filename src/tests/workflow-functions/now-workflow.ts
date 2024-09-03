import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxy/proxyActivities.js";

const { now } = proxyActivities(activities, {});

export async function nowWorkflow(): Promise<Date> {
    return await now();
}
