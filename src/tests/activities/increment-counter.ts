import { Counters } from "./Counters.js";

export async function incrementCounter(name: string): Promise<void> {
    Counters.increment(name);
}
