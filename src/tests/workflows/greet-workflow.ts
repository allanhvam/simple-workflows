import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { greet } = proxyActivities(activities, {});

export async function greetWorkflow(name: string): Promise<string> {
    return await greet(name);
}
