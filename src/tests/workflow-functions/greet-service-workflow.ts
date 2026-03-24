import { proxyActivities } from "../../proxy/proxyActivities.ts";
import { GreetService } from "../services/GreetService.ts";

const greetService = proxyActivities(new GreetService());

export async function greetServiceWorkflow(name: string): Promise<string> {
    return await greetService.greet(name);
}
