import "zone.js";
import { Scope } from "./scope";
import { BaseTracer } from "./tracer";

export class ZonejsTracer extends BaseTracer {
  private _id = 0;

  private _zone_uuid = () => {
    return `SENTRY_TRACING_${this._id++}`;
  };

  public withScope<T>(fn: (scope?: Scope) => T): T {
    const scope: Scope = Zone.current.get("scope")?.clone() || new Scope();

    return Zone.current
      .fork({
        name: this._zone_uuid(),
        properties: {
          scope,
        },
      })
      .run(() => fn(scope));
  }
}
