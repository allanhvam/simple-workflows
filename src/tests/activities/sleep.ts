import { sleep as sleepImpl } from "../../sleep";

export async function sleep(ms: string): Promise<void> {
    await sleepImpl(ms);
}