import * as activities from "../activities/index.ts";
import { proxyActivities } from "../../proxy/proxyActivities.ts";

const { add } = proxyActivities(activities, {});

export async function addWorkflow(x = 1, y = 2): Promise<number> {
    return await add(x, y);
}
