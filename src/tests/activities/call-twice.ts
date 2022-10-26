import { Counters } from "./Counters";

export async function callTwice(): Promise<string> {
    let called = Counters.get("call-twice");
    if (called) {
        return "ok";
    }
    Counters.increment("call-twice");
    return Promise.reject(new Error("call-twice: only called once"));
}