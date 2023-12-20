import { type IRetryPolicy } from "./IRetryPolicy";
import { sleep } from "./sleep";

/**
 * @internal
 */
export class DefaultRetryPolicy implements IRetryPolicy {
    constructor(private readonly retries: number) {

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
