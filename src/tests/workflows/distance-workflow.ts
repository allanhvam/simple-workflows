import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxyActivities.js";

const { getDistance } = proxyActivities(activities, {});

export async function distanceWorkflow(): Promise<number> {
    const p1 = { x: 1, y: 1 };
    const p2 = { x: 2, y: 1 };

    const a = await getDistance(p1, p2);
    p1.x = 3;
    const b = await getDistance(p1, p2);
    return a + b;
}
