import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";

const { callTwice } = proxyActivities(activities, { retry: 5 });

export async function callTwiceWorkflow(): Promise<string> {
    return await callTwice();
}
