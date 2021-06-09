
Q: What are "sane" defaults
- How we do wanna perscribe an approach for tracing

Mode declares how hub acts as a concurrency unit
Similar to sessions -> requests/client

```ts
Sentry.init({
  mode: 'client'
});

type mode:
  | 'client' // global singleton hub (ex. like what's on mobile, cocoa, flutter SDKs)
  | 'request' // Lock<Cloneable<Hub>>

Hub with ClientAttributes ...

Hub with RequestAttributes ...

// This won't work
interface Hub {

  // captureException -> dispatch to client.eventProcessor ...

  Transport: ...
  
  // This has all the processors (is aware of tracer, scope, meter)
  Client: {
    eventProcessors ...
    spanProcessors ...
    meterProcessors ...

    // after going through processor, gets sent to transport
    sendToTransport ...
  }

  // key,val pairs, some values have special meaning (breadcrumbs)
  Scope: {
    ...
  } as HashMap<any, any> & ScopeContext

  Tracer: {
    sample_rate: ...
    enabled: (set from sample_rate)
    // creates spans, send them to client span processor
    startSpan ...


  }
  
  // Eventually to store measurements?
  Meter,
}
```

## Example Scenarios

### Multiple Sentry roots

|--------|----|
|        |    |
|        |    |
|        |----|
|        |    |
|--------|----|

page with 3 parts, each it's own Sentry init?

- How do we solve this?

### Navigation

```ts
// Pageload finishes (according to whatever metric we use)

dispatch("SAVE_THEN_NAVIGATE");

...

// Right now we lose the spans from save()
// What if we have polling fetch that happens between save()
// and navigate()?
case "SAVE_THEN_NAVIGATE":
  // image save creates a span under the hood
  save();
  navigate();
```

### React: opening a Modal

```tsx
function Modal() {
  const [state, setState] = React.useState(undefined);
  React.useEffect(() => {
    // fetch should be doing `withScope() => hub.startSpan`
    // Maybe it's patched with `hub.tracer`?
    fetch('/api/...')
    .then(res => res.json())
    .then(r => {
      setState(r);
    })
    .catch(e => {
      Sentry.captureException(e);
    })
    .finally(() => {
      hub.withScope(scope => {

        // How do we end the span here?
        // Should we require users to always pass the span down.
        hub.stopSpan
      })
    })
  });

  return (
    ...
  )
}

function App() {
  const [state, dispatch] = useReducer(...);

  function handleButtonClick() {
    // This sucks when Sentry is not defined
    getCurrentHub().withScope(scope => {
      // span is on the scope?

      // Goal: Figure out when the span renders!
      // If we are in React land we could propogate this through components
      // with hooks and store in React Context - would need to rely on a singleton though
      hub.startSpan({ name: 'open-important-modal' });
      // Tracer.tracer(() => {}) does not work here, we have to wait for the React
      // framework to re-render, so tracking dispatch (a pure func), does nothing
      dispatch("OPEN_MODAL");
    });
  }

  return (
    ...
    ...

    <button onClick={handleButtonClick}>Click Me</button>
    <Modal
      open={state.modalOpen}
    />
    ...
  );
}
```

- React Context?

## Notes

Tracer:
  -> hub.initTracer?

Singleton hub?
  -> 

Integrations:
  -> hub.startSpan (alias for hub.tracer.startSpan?)
  -> 
