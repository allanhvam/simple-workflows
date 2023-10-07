import { proxyActivities } from "../../proxyActivities";
import { GreetService } from "../activities/GreetService";

const greetService = proxyActivities(new GreetService(), {});

export async function greetServiceWorkflow(name: string): Promise<string> {
    return await greetService.greet(name);
}
