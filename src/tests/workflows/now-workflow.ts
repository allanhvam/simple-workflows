import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { now } = proxyActivities(activities, {});

export async function nowWorkflow(): Promise<Date> {
    return now();
}
