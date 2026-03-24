import { Counters } from "./Counters.ts";

export async function getCounter(name: string): Promise<number> {
    return Counters.get(name);
}
