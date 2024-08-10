import { greet } from "../activities/greet.js";

export class GreetService {
    public prop = "prop";
    public greet = greet;

    public promise = async (): Promise<string> => {
        return await Promise.resolve("");
    };

    public standard = (): string => {
        return "";
    };
}
