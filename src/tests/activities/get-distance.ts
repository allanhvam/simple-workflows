export async function getDistance(p1: { x: number, y: number }, p2: { x: number, y: number }): Promise<number> {
    return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}
