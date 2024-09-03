import { proxyActivities } from "../../proxy/proxyActivities.js";
import { GreetService } from "../services/GreetService.js";

const greetService = proxyActivities(new GreetService());

export async function greetServiceWorkflow(name: string): Promise<string> {
    return await greetService.greet(name);
}
