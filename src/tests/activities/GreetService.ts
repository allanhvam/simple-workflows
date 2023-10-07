import { greet } from "./greet";

export class GreetService {
    public prop = "prop";
    public greet = greet;

    public promise = async () => {
        return Promise.resolve("");
    }

    public standard = () => {
        return "";
    }
}