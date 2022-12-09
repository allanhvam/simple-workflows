import * as activities from "../activities";
import { proxyActivities } from "../../proxyActivities";

const { sleep } = proxyActivities(activities, {});

export async function concurrentWorkflow(): Promise<void> {
    function shuffleArray(array: Array<string>) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            let temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    let array = ["1ms", "2ms", "3ms", "400ms", "5ms", "6ms", "7ms", "800ms", "9ms", "10ms"];
    shuffleArray(array);

    await Promise.all(array.map(ms => sleep(ms)));
}
