import msPkg from "ms";

/**
 * @internal
 */
export function sleep(ms: number | string): Promise<void> {
    let timeout: number;
    if (typeof ms === "string") {
        timeout = msPkg(ms);
    } else {
        timeout = ms;
    }
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timeout);
    });
}