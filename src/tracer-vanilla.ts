import "zone.js";
import { Scope } from "./scope";
import { BaseTracer } from "./tracer";

export class VanillaTracer extends BaseTracer {
  private _id = 0;
  private _scopes: Map<number, Scope> = new Map();

  private _getScopeId = (): number => {
    return this._id++;
  };

  private _getScopeById = (id: number | undefined): Scope | undefined => {
    return this._scopes.get(id);
  };

  private _getScopeIdFromStack = (): number | undefined => {
    const e = new Error();
    const key = e.stack.match(/(?<=SENTRY_SCOPE_ID_)(?:\d+)/);
    const value = Number.parseInt(key?.[0], 10);
    return Number.isNaN(value) ? undefined : value;
  };

  public withScope<T>(fn: (scope?: Scope) => T): T {
    const stackId = this._getScopeIdFromStack();
    const scopeId = this._getScopeId();
    const fnName = `SENTRY_SCOPE_ID_${scopeId}`;
    return {
      [fnName]: (callback) => {
        const scope = this._getScopeById(stackId)?.clone() || new Scope();
        this._scopes.set(scopeId, scope);
        return callback(scope);
      },
    }[fnName](fn);
  }
}
