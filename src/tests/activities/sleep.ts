import type { msStringValue } from "../../ms.ts";
import { sleep as sleepImpl } from "../../sleep.ts";

export async function sleep(ms: msStringValue): Promise<void> {
    await sleepImpl(ms);
}
