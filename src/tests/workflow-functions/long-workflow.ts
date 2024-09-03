import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxy/proxyActivities.js";

const { greet } = proxyActivities(activities, {});

export async function longWorkflow(): Promise<void> {
    for (let i = 0; i !== 125; i++) {
        await greet(`${i} Workflow`);
    }
}
