
export interface ISerializer {
    stringify(o: any): string;
    parse<T>(s: string): T;
}