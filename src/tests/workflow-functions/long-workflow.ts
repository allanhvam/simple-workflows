import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";

const { greet } = proxyActivities(activities, {});

export async function longWorkflow(): Promise<void> {
    for (let i = 0; i !== 125; i++) {
        await greet(`${i} Workflow`);
    }
}
