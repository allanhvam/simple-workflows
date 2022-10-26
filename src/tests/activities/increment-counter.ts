import { Counters } from "./Counters";

export async function incrementCounter(name: string): Promise<void> {
    Counters.increment(name);
}