import { sleep as sleepImpl } from "../../sleep.js";

export async function sleep(ms: string): Promise<void> {
    await sleepImpl(ms);
}
