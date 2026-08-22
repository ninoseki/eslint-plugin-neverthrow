# neverthrow/must-use-result

> Not handling neverthrow result is a possible error because errors could remain unhandleds.

## Rule Details

This rule disallows `Result` values that are not handled. A `Result` is considered handled when one of the following is true:

- It is terminated with `match`, `unwrapOr`, or `_unsafeUnwrap` (directly or after a chain of `map` / `mapErr` / `andThen` / `orElse`).
- It is guard-checked with `isOk()` or `isErr()` (the methods must be called, not just referenced).
- It is returned from a function (including arrow-function shorthand and via `await`).
- It is passed as an array element to a wrapping call whose own return type is a `Result` — e.g. `combine([...])`, `combineWithAllErrors([...])`, `Result.combine([...])`. In that case the handle obligation transfers to the wrapping call.
- `await` is treated transparently — `await getResult()` participates in the same handling checks as `getResult()`. This covers `ResultAsync` as well as a plain `Promise<Result>`, e.g. an `async function` declared to return `Promise<Result<T, E>>`.
- It is a class field initializer (`class A { r = getResult() }`). These are excluded rather than handled: the rule cannot follow `this.r` to its use sites, so reporting them would be a false positive whenever the field is handled in a method.
- It is propagated with `yield*` inside a generator passed to `safeTry(...)`. `yield*` rethrows the `Err` to the surrounding `safeTry`, so the result is considered handled. Note that plain `yield` (without `*`) and an un-yielded call inside the generator are **not** treated as handled — they don't propagate errors.

Below shows an incorrect snippet and the corresponding way to make the same code valid.

### Terminate with a handler

Bad:

```ts
const result = getResult()
result.map(() => {})
```

Good:

```ts
const result = getResult()
result.map(() => {}).unwrapOr('')
// or
getResult().match(() => {}, () => {})
```

### Don't just pass a Result around

Bad:

```ts
const v = getResult()
externalFunction(v)
```

Good:

```ts
const v = getResult().unwrapOr('default')
externalFunction(v)
```

### Call `isOk` / `isErr`, don't just reference them

Bad:

```ts
const res = getResult()
if (res.isOk) {
  // ...
}
```

Good:

```ts
const result = getResult()
if (result.isOk()) {
  // ...
}
```

### Handle the awaited Result

Bad:

```ts
const res = await getResult()
await getResult()
```

Good:

```ts
const res = await getResult()
res.unwrapOr(5)
// or, inline:
(await getResult()).unwrapOr(5)
```

### Handle the result of `combine([...])`

Bad:

```ts
const result1 = getResult()
const result2 = getResult()
Result.combine([result1, result2])
```

Good:

```ts
const result1 = getResult()
const result2 = getResult()
Result.combine([result1, result2]).unwrapOr('')
```

### Use `yield*` in `safeTry` generators

Bad — plain `yield` doesn't propagate the `Err`:

```ts
function consume(): Result<number, string> {
  return safeTry(function* () {
    yield mightError()
    return ok(1)
  })
}
```

Also bad — an un-yielded call is just ignored:

```ts
function consume(): Result<number, string> {
  return safeTry(function* () {
    mightError()
    return ok(1)
  })
}
```

Good — `yield*` rethrows the `Err` to the surrounding `safeTry`:

```ts
function consume(): Result<number, string> {
  return safeTry(function* () {
    const value = yield* mightError()
    return ok(value)
  })
}
```

## Options

Nothing.

## Implementation

- [Rule source](../../src/rules/must-use-result.ts)
- [Test source](../../tests/rules/must-use-result.test.ts)
