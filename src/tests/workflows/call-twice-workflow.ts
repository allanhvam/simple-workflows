import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxyActivities.js";

const { callTwice } = proxyActivities(activities, { retry: 5 });

export async function callTwiceWorkflow(): Promise<string> {
    return await callTwice();
}
