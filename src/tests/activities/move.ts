export async function move(p1: { x: number, y: number }, direction: "north"): Promise<{ x: number, y: number }> {
    p1.y++;
    return p1;
}