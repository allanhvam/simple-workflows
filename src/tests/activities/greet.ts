export async function greet(name: string | undefined): Promise<string> {
    return `Hello, ${name}!`;
}