import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { add } = proxyActivities(activities, {});

export async function addWorkflow(x = 1, y = 2): Promise<number> {
    return await add(x, y);
}
