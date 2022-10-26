import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { greet } = proxyActivities(activities, {});

export async function longWorkflow(): Promise<void> {
    for (let i = 0; i !== 125; i++) {
        await greet(`${i} Workflow`);
    }
}
