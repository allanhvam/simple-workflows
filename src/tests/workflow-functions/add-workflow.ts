import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxy/proxyActivities.js";

const { add } = proxyActivities(activities, {});

export async function addWorkflow(x = 1, y = 2): Promise<number> {
    return await add(x, y);
}
