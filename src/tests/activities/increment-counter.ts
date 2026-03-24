import { Counters } from "./Counters.ts";

export async function incrementCounter(name: string): Promise<void> {
    Counters.increment(name);
}
