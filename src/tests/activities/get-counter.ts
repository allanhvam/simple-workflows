import { Counters } from "./Counters.js";

export async function getCounter(name: string): Promise<number> {
    return Counters.get(name);
}
