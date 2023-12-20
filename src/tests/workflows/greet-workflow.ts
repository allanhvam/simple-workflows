import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { greet } = proxyActivities(activities, {});

export async function greetWorkflow(name: string | undefined): Promise<string> {
    return await greet(name);
}
