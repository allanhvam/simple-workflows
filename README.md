# simple-workflows

Simple repeatable workflows and activities as code. 

Goals:
  - Repeatable long running programs.
  - Close to zero dependencies.
  - No extra infrastructure requirements.
  - Statically typed.

History/state can be serialized to:
  - Memory
  - File System
  - Azure Table and Blob Storage

Inspired by [Azure Durable Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview?tabs=javascript) and [Temporal](https://temporal.io/).

# Activities
All activities is just normal functions that return promises, but must be idempotent and both args and return value must be serializable.

Example activity:

```ts
export async function greet(name: string): Promise<string> {
    return `Hello, ${name}!`;
}
```

# Workflows

Workflows is build by activities. When activities is used in workflows, they must be passed to the `proxyActivities` function:

```ts
import * as activities from '../activities';
import { proxyActivities } from "simple-workflows";

const { greet } = proxyActivities(activities, {});

export async function greetWorkflow(name: string): Promise<string> {
    return await greet(name);
}
```

# Getting started

```ts
import { WorkflowWorker } from "simple-workflows";

const worker = WorkflowWorker.getInstance();

const handle = await worker.start(greetWorkflow, {
    args: ["debug"],
    workflowId: "debug",
});

console.log(`Started workflow ${handle.workflowId}`);

let result = await handle.result();
```

# Custom serialization

By default standard JSON serialization is used, the serialization can be customized 
by setting serializer on the store eg.:

```ts
import superjson from 'superjson';

const worker = WorkflowWorker.getInstance();
const store = new DurableFunctionsWorkflowHistoryStore({
  connectionString: "UseDevelopmentStorage=true",
  serializer: superjson,
});
worker.store = store;
```

# Limitations

- Workflows & activities is executed in the current process
- Workflows & activities will not forcefully be stopped on timeout