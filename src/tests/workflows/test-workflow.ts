import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxyActivities.js";

const { getWorkflowId } = proxyActivities(activities, {});

export async function testWorkflow(): Promise<string | undefined> {
    return await getWorkflowId();
}
