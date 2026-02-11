/**
 * @internal
 */
export type PublicPart<T> = { [K in keyof T]: T[K] };