import { Scope, Span, SpanDescription } from "./scope";

export interface Tracer {
  trace<T>(description: SpanDescription, callback: (scope: Scope) => T): T;
}

export abstract class BaseTracer implements Tracer {
  protected abstract withScope<T>(fn: (scope: Scope) => T): T;

  public trace<T>(
    description: SpanDescription,
    callback: (scope: Scope) => T
  ): T {
    return this.withScope((scope) => {
      const spanDescription = { ...description };
      const parentSpan = scope.getSpan();
      if (parentSpan) {
        spanDescription.parentId = parentSpan.id;
      }
      const span = new Span(spanDescription);
      scope.setSpan(span);

      try {
        const rv = callback(scope);
        if (isPromise(rv)) {
          return rv.then(
            (r) => {
              span.end();
              return r;
            },
            (e) => {
              span.error();
              span.end();
              return e;
            }
          );
        }
        span.end();
        return rv;
      } catch (e) {
        span.error();
        span.end();
        return e;
      }
    });
  }
}

function isObject(value): boolean {
  return (
    value !== null && (typeof value === "object" || typeof value === "function")
  );
}

function isPromise<T>(value: any): value is Promise<T> {
  return (
    value instanceof Promise ||
    (isObject(value) &&
      typeof value.then === "function" &&
      typeof value.catch === "function")
  );
}
