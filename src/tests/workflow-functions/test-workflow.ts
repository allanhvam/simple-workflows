import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";

const { getWorkflowId } = proxyActivities(activities, {});

export async function testWorkflow(): Promise<string | undefined> {
    return await getWorkflowId();
}
