export class StateService {
    private state: string = "";

    public async get(): Promise<string> {
        return await Promise.resolve(this.state);
    };

    public async set(state: string): Promise<void> {
        this.state = state;
        return await Promise.resolve();
    };
}
