export interface ISerializer {
    stringify: (o: any) => string
    parse: <T>(s: string) => T
    equal?: (val1: any, val2: any) => boolean
}
