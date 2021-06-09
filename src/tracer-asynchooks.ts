import { AsyncLocalStorage } from "async_hooks";
import { Scope } from "./scope";
import { BaseTracer } from "./tracer";

export class AsyncHooksTracer extends BaseTracer {
  public withScope<T>(fn: (scope?: Scope) => T): T {
    const asyncLocalStorage = new AsyncLocalStorage();
    const store = (asyncLocalStorage.getStore() || {}) as { scope?: Scope };
    const scope = store.scope?.clone() || new Scope();

    return asyncLocalStorage.run(
      {
        scope,
      },
      () => fn(scope)
    );
  }
}
