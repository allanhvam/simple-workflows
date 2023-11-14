import { ISerializer } from "./ISerializer";

/**
 * @internal
 */
export class DefaultSerializer implements ISerializer {
    stringify(o: any): string {
        return JSON.stringify(o, (k, v) => v === undefined ? null : v);
    }
    parse<T>(s: string): T {
        return JSON.parse(s);
    }
    equal = (a: any, b: any): boolean => {
        return this.stringify(a) === this.stringify(b);
    }
}