import type { msStringValue } from "../../ms.js";
import { sleep as sleepImpl } from "../../sleep.js";

export async function sleep(ms: msStringValue): Promise<void> {
    await sleepImpl(ms);
}
