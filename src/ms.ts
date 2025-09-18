export type msStringValue = `${number}ms` | `${number}s` | `${number}m` | `${number}h`;

/**
 * @internal
 */
export const ms = (ms: number | msStringValue): number => {
    if (typeof ms === "number") {
        return ms;
    }

    let num = 1;
    let multiplier = 1;
    if (ms.includes("ms")) {
        multiplier = 1;
        num = parseInt(ms.replace("ms", ""));
    } else if (ms.includes("s")) {
        multiplier = 1000;
        num = parseInt(ms.replace("s", ""));
    } else if (ms.includes("m")) {
        multiplier = 60 * 1000;
        num = parseInt(ms.replace("m", ""));
    } else if (ms.includes("h")) {
        multiplier = 60 * 60 * 1000;
        num = parseInt(ms.replace("h", ""));
    }

    return num * multiplier;
};
