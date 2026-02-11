type PromiseFuncKeys<T> = {
    [K in keyof T]: T[K] extends ((...args: any[]) => Promise<any> | PromiseLike<any>) ? K : never;
}[keyof T];

export type OnlyAsync<T> = Pick<T, PromiseFuncKeys<T>>;
