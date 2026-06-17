import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";

const { greet } = proxyActivities(activities, {});

export async function greetWorkflow(name: string | undefined): Promise<string> {
    return await greet(name);
}
