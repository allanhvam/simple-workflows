import { Counters } from "./Counters.js";

export async function callTwice(): Promise<string> {
    const called = Counters.get("call-twice");
    if (called) {
        return "ok";
    }
    Counters.increment("call-twice");
    return await Promise.reject(new Error("call-twice: only called once"));
}
