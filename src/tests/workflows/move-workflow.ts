import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { move } = proxyActivities(activities, {});

export async function moveWorkflow(): Promise<{ x: number, y: number }> {
    let point = { x: 0, y: 0 };

    point = await move(point, "north");
    return await move(point, "north");
}
