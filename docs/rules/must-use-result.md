# neverthrow/must-use-result

> Not handling neverthrow result is a possible error because errors could remain unhandleds.

## Rule Details

This rule disallows `Result` values that are not handled. A `Result` is considered handled when one of the following is true:

- It is terminated with `match`, `unwrapOr`, or `_unsafeUnwrap` (directly or after a chain of `map` / `mapErr` / `andThen` / `orElse`).
- It is guard-checked with `isOk()` or `isErr()` (the methods must be called, not just referenced).
- It is returned from a function (including arrow-function shorthand and via `await`).
- It is passed as an array element to a wrapping call whose own return type is a `Result` — e.g. `combine([...])`, `combineWithAllErrors([...])`, `Result.combine([...])`. In that case the handle obligation transfers to the wrapping call.
- `await` on a `Result` / `ResultAsync` is treated transparently — `await getResult()` participates in the same handling checks as `getResult()`.

Examples of **incorrect** code:

```ts
/*eslint neverthrow/must-use-result: error */

// no terminal handler
const result = getResult();
result.map(() => {})

// result used just as a parameter to a non-Result-returning function
const v = getResult()
externalFunction(v)

// isOk / isErr referenced but not called
const res = getResult();
if (res.isOk) {
  return ok()
}

// awaited result with no terminal handler
const res = await getResult();
await getResult();

// combine([...]) result itself is not handled
const result1 = getResult()
const result2 = getResult()
combine([result1, result2])
```

Examples of **correct** code:

```ts
/*eslint neverthrow/must-use-result: error */

const result = getResult()
result.unwrapOr('')

// chained with a terminal handler
getResult().map(() => {}).unwrapOr('')

// match
getResult().match(() => {}, () => {})

// guard-checked with isOk() / isErr()
const result = getResult()
if (result.isOk()) {
  return ok()
}

// returned from a function
function main() {
  return getResult().map(() => {})
}
const main = () => getResult().map(() => {})

// await on the result
const res = await getResult()
res.unwrapOr(5)

// passed into a Result-returning wrapper that is itself handled
const result1 = getResult()
const result2 = getResult()
combine([result1, result2]).unwrapOr('')
```

## Options

Nothing.

## Implementation

- [Rule source](../../src/rules/must-use-result.ts)
- [Test source](../../tests/rules/must-use-result.test.ts)
