import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { getWorkflowId } = proxyActivities(activities, {});

export async function testWorkflow(): Promise<string | undefined> {
    return await getWorkflowId();
}
