import { VanillaTracer } from "./tracer-vanilla";

function syncOperation() {
  return Array.from({ length: 1e6 }, (_, i) => i).reduce((acc, v) => acc + v);
}

async function asyncOperation() {
  return Array.from({ length: 1e6 }, (_, i) => i).reduce((acc, v) => acc + v);
}

// Result of syncOperation/asyncOperation calculations.
const TEST_VALUE = 499999500000;

describe("VanillaTracer", () => {
  let tracer;

  beforeEach(() => {
    tracer = new VanillaTracer();
  });

  test("preserves valid parent scope context in sync operations", () => {
    let spanA, spanB, spanC;

    const rv = tracer.trace({ transaction: "nestedSync" }, (span) => {
      spanA = span;
      const a = syncOperation();

      return tracer.trace({ op: "level1" }, (span) => {
        spanB = span;
        const b = syncOperation();

        return tracer.trace({ op: "level2" }, (span) => {
          spanC = span;
          return a + b + syncOperation();
        });
      });
    });

    expect(spanA.parentId).toEqual(undefined);
    expect(spanB.parentId).toEqual(spanA.id);
    expect(spanC.parentId).toEqual(spanB.id);
    expect(rv).toEqual(TEST_VALUE * 3);
  });

  test("preserves valid parent scope context in async operations", async () => {
    let spanA, spanB, spanC;

    const rv = await tracer.trace(
      { transaction: "nestedSync" },
      async (span) => {
        spanA = span;
        const a = await asyncOperation();

        return tracer.trace({ op: "level1" }, async (span) => {
          spanB = span;
          const b = await asyncOperation();

          return tracer.trace({ op: "level2" }, async (span) => {
            spanC = span;
            return a + b + (await asyncOperation());
          });
        });
      }
    );

    expect(spanA.parentId).toEqual(undefined);
    expect(spanB.parentId).toEqual(spanA.id);
    expect(spanC.parentId).toEqual(spanB.id);
    expect(rv).toEqual(TEST_VALUE * 3);
  });

  // sync inside async parent root _is_ possible
  // async inside sync parent root _is not_ possible
  test("preserves valid parent scope context in mixed operations", async () => {
    let spanA, spanB, spanC;

    const rv = await tracer.trace(
      { transaction: "nestedSync" },
      async (span) => {
        spanA = span;
        const a = await asyncOperation();

        return tracer.trace({ op: "level1" }, (span) => {
          spanB = span;
          const b = syncOperation();

          return tracer.trace({ op: "level2" }, async (span) => {
            spanC = span;
            return a + b + (await asyncOperation());
          });
        });
      }
    );

    expect(spanA.parentId).toEqual(undefined);
    expect(spanB.parentId).toEqual(spanA.id);
    expect(spanC.parentId).toEqual(spanB.id);
    expect(rv).toEqual(TEST_VALUE * 3);
  });
});
