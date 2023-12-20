export class Counters {
    private static readonly counters = new Map<string, number>();

    public static get(name: string): number {
        if (this.counters.has(name)) {
            return this.counters.get(name) ?? 0;
        }
        return 0;
    }

    public static increment(name: string): number {
        const i = Counters.get(name) + 1;
        Counters.counters.set(name, i);
        return i;
    }
}
