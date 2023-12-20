import { Counters } from "./Counters";

export async function getCounter(name: string): Promise<number> {
    return Counters.get(name);
}
