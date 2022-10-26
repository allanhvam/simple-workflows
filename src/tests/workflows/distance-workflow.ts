import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { getDistance } = proxyActivities(activities, {});

export async function distanceWorkflow(): Promise<number> {
    let p1 = { x: 1, y: 1 };
    let p2 = { x: 2, y: 1 };

    let a = await getDistance(p1, p2);
    p1.x = 3;
    let b = await getDistance(p1, p2);
    return a + b;
}
