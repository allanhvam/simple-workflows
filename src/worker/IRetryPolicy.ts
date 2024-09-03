export interface IRetryPolicy {
    retry: <T>(f: () => Promise<T>) => Promise<T>
}
