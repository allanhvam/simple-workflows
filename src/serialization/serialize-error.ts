// Original version from:
// https://github.com/sindresorhus/serialize-error

export type Primitive =
    | null
    | undefined
    | string
    | number
    | boolean
    | symbol
    | bigint;

export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
export type JsonObject = { [Key in string]?: JsonValue };

export type ErrorObject = {
    name?: string;
    stack?: string;
    message?: string;
    code?: string;
} & JsonObject;

export interface IOptions {
    readonly maxDepth?: number;
}

export class NonError extends Error {
    override name = "NonError";

    constructor(message) {
        super(NonError.prepareSuperMessage(message));
    }

    private static prepareSuperMessage(message): string {
        try {
            return JSON.stringify(message);
        } catch {
            return String(message);
        }
    }
}

const commonProperties = [
    {
        property: "name",
        enumerable: false,
    },
    {
        property: "message",
        enumerable: false,
    },
    {
        property: "stack",
        enumerable: false,
    },
    {
        property: "code",
        enumerable: true,
    },
];

const toJsonWasCalled = Symbol(".toJSON was called");

const toJSON = (from): any => {
    from[toJsonWasCalled] = true;
    const json = from.toJSON();
    delete from[toJsonWasCalled];
    return json;
};

const destroyCircular = <ErrorType extends object>({
    from,
    seen,
    to_,
    forceEnumerable,
    maxDepth,
    depth,
}: { from: ErrorType; seen: Array<any>; to_?: any; forceEnumerable?: boolean; maxDepth: number; depth: number }) => {
    const to = to_ || (Array.isArray(from) ? [] : {});

    seen.push(from);

    if (depth >= maxDepth) {
        return to;
    }

    if (typeof from["toJSON"] === "function" && from[toJsonWasCalled] !== true) {
        return toJSON(from);
    }

    for (const [key, value] of Object.entries(from)) {
        if (typeof Buffer === "function" && Buffer.isBuffer(value)) {
            to[key] = "[object Buffer]";
            continue;
        }

        // TODO: Use `stream.isReadable()` when targeting Node.js 18.
        if (value !== null && typeof value === "object" && "pipe" in value && typeof value.pipe === "function") {
            to[key] = "[object Stream]";
            continue;
        }

        if (typeof value === "function") {
            continue;
        }

        if (!value || typeof value !== "object") {
            to[key] = value;
            continue;
        }

        if (!seen.includes(from[key])) {
            depth++;

            to[key] = destroyCircular({
                from: from[key],
                seen: [...seen],
                forceEnumerable,
                maxDepth,
                depth,
            });
            continue;
        }

        to[key] = "[Circular]";
    }

    for (const { property, enumerable } of commonProperties) {
        if (typeof from[property] === "string") {
            Object.defineProperty(to, property, {
                value: from[property],
                enumerable: forceEnumerable ? true : enumerable,
                configurable: true,
                writable: true,
            });
        }
    }

    return to;
};

export function serializeError<ErrorType>(value: ErrorType, options: IOptions = {}): ErrorType extends Primitive ? ErrorType : ErrorObject {
    const { maxDepth = Number.POSITIVE_INFINITY } = options;

    if (typeof value === "object" && value !== null) {
        return destroyCircular({
            from: value,
            seen: [],
            forceEnumerable: true,
            maxDepth,
            depth: 0,
        });
    }

    // People sometimes throw things besides Error objects…
    if (typeof value === "function") {
        // `JSON.stringify()` discards functions. We do too, unless a function is thrown directly.
        return `[Function: ${(value.name || "anonymous")}]` as any;
    }

    return value as any;
}

export function deserializeError(value: ErrorObject | unknown, options: IOptions = {}): Error | unknown {
    const { maxDepth = Number.POSITIVE_INFINITY } = options;

    if (value instanceof Error) {
        return value;
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const newError = new Error();
        destroyCircular({
            from: value,
            seen: [],
            to_: newError,
            maxDepth,
            depth: 0,
        });
        return newError;
    }

    return value;
}
