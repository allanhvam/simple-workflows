import type { msStringValue } from "./ms.js";
import { ms as msFunc } from "./ms.js";

/**
 * @internal
 */
export async function sleep(ms: number | msStringValue): Promise<void> {
    let timeout: number;
    if (typeof ms === "string") {
        timeout = msFunc(ms);
    } else {
        timeout = ms;
    }
    return await new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeout);
    });
}
