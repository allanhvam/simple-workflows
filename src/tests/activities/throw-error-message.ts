export async function throwErrorMessage(message: string): Promise<void> {
    throw new Error(message);
}
