import {
  formatDiagnosticsWithColorAndContext,
  isConstructorDeclaration,
  isImportEqualsDeclaration,
} from "typescript";

async function validateShoppingCartOnServer() {
  return 42;
}

function processAndValidateShoppingCart(cart) {
  console.log("cart was", cart);
}

type Scope = {};

interface Client {
  captureSpan(span: Span): void;
  captureEvent(event: {}, scope: Scope): void;
}

type TraceOptions = {
  transaction?: string;
  op?: string;
  parentSpanId?: string;
  traceId?: string;
  client?: Client;
};

interface FlowContext {
  getValue(key: symbol): unknown;
  setValue(key: symbol, value: unknown): FlowContext;
  deleteValue(key: symbol): FlowContext;
}

type TraceDescription = string | TraceOptions;

class Span {
  public id: string;
  public traceId: string;
  public finished?: Date;

  constructor(description: TraceDescription) {
    Object.assign(this, description);
  }

  end() {
    this.finished = new Date();
  }
}

const globalContext: FlowContext = null as any;

function withContext<T>(context: FlowContext, callback: () => T): T {
  return callback();
}

// assumption: Hub { scope: Scope, client: Client }, Scope { span: Span, tags: {[string]: string}, ... }

function trace<T>(
  description: TraceDescription,
  callback: (span?: Span) => T,
  // would exist for go if we were to do this
  context?: FlowContext
): T {
  // otel: fork span with flow control
  // otel: fork span + scope with flow control -> scope holds span

  if (!context) {
    context = getCurrentContextFromZone();
  }

  if (typeof description === "string") {
    description = { op: description };
  }

  const client =
    description.client || context.getValue("client") || globalClient;
  const scope = context.getValue("scope");
  const newScope = new Scope(scope);
  const newContext = context
    .setValue("client", client)
    .setValue("scope", newScope);

  description.parentSpanId = scope.getSpan().id;
  description.traceId = newScope.getSpan().traceId;
  const newSpan = new Span(description);
  newScope.setSpan(newSpan);

  return runInsideZoneWithContext(newContext, () => {
    try {
      return callback();
    } finally {
      newSpan.end();
      client.captureSpan(newSpan, newScope);
    }
  });
}

function traceSimple<T>(
  description: TraceDescription,
  callback: (span?: Scope) => T
): T {
  // withScope is managing context for you automatically
  return withScope((newScope) => {
    if (typeof description === "string") {
      description = { op: description };
    }
    description.parentSpanId = newScope.getSpan().id;
    description.traceId = newScope.getSpan().traceId;
    const newSpan = new Span(description);
    newScope.setSpan(newSpan);

    try {
      const rv = callback(newScope);
      let isAsync = false;
      if (rv.then) {
        isAsync = true;
        return rv.then(
          (result) => {
            newSpan.end();
            getClientForScope(newScope).captureSpan(newSpan);
            return result;
          },
          (err) => {
            newSpan.setStatus("failed");
            newSpan.setError(err);
            newSpan.end();
            getClientForScope(newScope).captureSpan(newSpan);
            return err;
          }
        );
      } else {
        return rv;
      }
    } catch (err) {
      newSpan.setStatus("failed");
      newSpan.setError(err);
    } finally {
      if (!isAsync) {
        newSpan.end();
        getClientForScope(newScope).captureSpan(newSpan);
      }
    }
  });
}

function shopCheckout() {
  trace({ transaction: "shopCheckout", client: null as any }, async () => {
    const result = validateShoppingCartOnServer();
    trace("task", () => {
      processAndValidateShoppingCart(result);
    });
  });
}
