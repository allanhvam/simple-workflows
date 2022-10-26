
export class Counters {
    private static counters = new Map<string, number>();

    public static get(name: string): number {
        if (this.counters.has(name)) {
            return Counters.counters.get(name);
        }
        return 0;
    }

    public static increment(name: string): number {
        let i = Counters.get(name) + 1;
        Counters.counters.set(name, i);
        return i;
    }
}