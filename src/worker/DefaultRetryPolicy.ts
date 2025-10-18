import { type IRetryPolicy } from "./IRetryPolicy.js";
import { sleep } from "../sleep.js";

/**
 * @internal
 */
export class DefaultRetryPolicy implements IRetryPolicy {
    private readonly retries: number;

    constructor(retries: number) {
        this.retries = retries;
    }

    public async retry<T>(f: () => Promise<T>, onError?: (e) => void): Promise<T> {
        let e: any;
        for (let i = 0; i !== this.retries; i++) {
            try {
                return await f().catch((ex) => {
                    throw ex;
                });
            } catch (error) {
                e = error;
                if (onError) {
                    onError(e);
                }
                await sleep(i * 5000);
            }
        }
        return await Promise.reject(e);
    }
}
