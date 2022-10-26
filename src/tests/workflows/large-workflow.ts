import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { greet } = proxyActivities(activities, {});

export async function largeWorkflow(long: string): Promise<string> {
    return await greet(long);
}
