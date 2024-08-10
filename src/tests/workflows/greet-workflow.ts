import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxyActivities.js";

const { greet } = proxyActivities(activities, {});

export async function greetWorkflow(name: string | undefined): Promise<string> {
    return await greet(name);
}
