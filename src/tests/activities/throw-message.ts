
export async function throwMessage(message: string): Promise<void> {
    throw new Error(message);
}