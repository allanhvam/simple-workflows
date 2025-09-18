import * as activities from "../activities/index.js";
import { proxyActivities } from "../../proxy/proxyActivities.js";

const { sleep } = proxyActivities(activities, {});

export async function concurrentWorkflow(): Promise<void> {
    function shuffleArray(array: Array<string>): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    const array = [
        "1ms" as const,
        "2ms" as const,
        "3ms" as const,
        "400ms" as const,
        "5ms" as const,
        "6ms" as const,
        "7ms" as const,
        "800ms" as const,
        "9ms" as const,
        "10ms" as const,
    ];
    shuffleArray(array);

    await Promise.all(array.map(async ms => await sleep(ms)));
}
