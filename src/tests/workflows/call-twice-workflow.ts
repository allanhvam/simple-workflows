import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { callTwice } = proxyActivities(activities, { retry: 5 });

export async function callTwiceWorkflow(): Promise<string> {
    return callTwice();
}
