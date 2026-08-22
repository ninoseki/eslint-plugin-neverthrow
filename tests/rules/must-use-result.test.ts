import tsParser from '@typescript-eslint/parser'
import { RuleTester } from '@typescript-eslint/rule-tester'
import { resolve } from 'path'

import { MessageIds, mustUseResult } from '../../src/rules/must-use-result'

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      project: './tsconfig.json',
      tsconfigRootDir: resolve(__dirname, '..', './fixtures'),
    },
  },
})

ruleTester.run('must-use-result', mustUseResult, {
  valid: [
    // call unwrapOr
    `
    const result = getResult()
    result.unwrapOr()
    `,
    // call unwrapOr after some methods
    `
    const result = getResult()
    result.map(() => {}).unwrapOr('')
    `,
    // Call match
    `
    const result = getResult()
    result.match(() => {}, () => {})
    `,
    // Return result from function
    `
    function main() {
      return getResult().map(() => {})
    }
    `,
    // Return result from an arrow function
    `
    const main = () => getResult().map(() => {})
    `,
    // Call a normal function
    `
    getNormal()
    `,
    // Await result handled properly
    `
    (await getResultAsync()).unwrapOr(5);
    const res1 = (await getResultAsync()).unwrapOr(5);
    const res2 = await getResultAsync();
    res2.unwrapOr(5);
    `,
    // Await Promise<Result> handled properly
    `
    (await getPromiseResult()).unwrapOr(5);
    const res3 = await getPromiseResult();
    res3.unwrapOr(5);
    `,
    // Return an awaited Promise<Result>
    `
    async function main() {
      return await getPromiseResult()
    }
    `,
    // Call isOk
    `
    const result = getResult()
    if (result.isOk()) {}
    `,
    // Call isErr
    `
    const result = getResult()
    if (!result.isErr()) {}
    `,
    // pass results into combine and handle the combined result
    `
    const result1 = getResult()
    const result2 = getResult()
    const result3 = getResult()
    Result.combine([result1, result2, result3]).unwrapOr('')
    `,
    // pass inline results into combine and handle the combined result
    `
    Result.combine([getResult(), getResult()]).match(() => {}, () => {})
    `,
    // pass async results into ResultAsync.combine and handle the combined result
    `
    const asyncRes1 = getResultAsync()
    const asyncRes2 = getResultAsync()
    ResultAsync.combine([asyncRes1, asyncRes2]).match(() => {}, () => {})
    `,
    // safeTry with yield* propagates Result errors
    `
    declare const mightError: () => Result<number, string>

    function consume(): Result<number, string> {
      return safeTry(function*() {
        const value = yield* mightError()
        return ok(value)
      })
    }
    `,
    // class field initializers are excluded -- the rule can't follow `this.r`
    // to its use sites, so reporting here would be a false positive
    `
    class A {
      r = getResult()
      static s = getResult()

      m() {
        return this.r.unwrapOr('')
      }
    }
    `,
  ],
  invalid: [
    {
      // only assignment
      code: `
      const result = getResult()
      `,
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      // Call map for result
      code: `
      const result = getResult();
      result.map(() => {})
      `,
      errors: [{ messageId: MessageIds.MUST_USE }, { messageId: MessageIds.MUST_USE }],
    },
    {
      // only call
      code: `
      getResult()
      `,
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      // call external function
      code: `
      const v = getResult()
      externalFunction(v)
      `,
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      // made call from object
      code: `
      obj.get()
      `,
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      // none of the handle methods is called
      code: `
      getResult().unwrapOr
      `,
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      // called inside a function
      code: `
      function main() {
        getResult().map(() => {})
      }
      `,
      errors: [{ messageId: MessageIds.MUST_USE }, { messageId: MessageIds.MUST_USE }],
    },
    {
      // Await result is not handled properly
      code: `
      const res = await getResultAsync();
      const res1 = await getResultAsync();
      res1.unwrapOr;

      await getResultAsync();
      `,
      errors: [
        { messageId: MessageIds.MUST_USE },
        { messageId: MessageIds.MUST_USE },
        { messageId: MessageIds.MUST_USE },
      ],
    },
    {
      // Await Promise<Result> is not handled properly
      code: `
      const res = await getPromiseResult();
      const res1 = await getPromiseResult();
      res1.unwrapOr;

      await getPromiseResult();
      `,
      errors: [
        { messageId: MessageIds.MUST_USE },
        { messageId: MessageIds.MUST_USE },
        { messageId: MessageIds.MUST_USE },
      ],
    },
    {
      // isOk without call is not handled
      code: `
      const res = getResult();
      if (res.isOk) {}
      `,
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      // combine result itself is not handled
      code: `
      const result1 = getResult()
      const result2 = getResult()
      Result.combine([result1, result2])
      `,
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      // ResultAsync.combine result itself is not handled
      code: `
      const asyncRes1 = getResultAsync()
      const asyncRes2 = getResultAsync()
      ResultAsync.combine([asyncRes1, asyncRes2])
      `,
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      // safeTry without yield* should still be handled explicitly
      code: `
      declare const mightError: () => Result<number, string>

      function consume(): Result<number, string> {
        return safeTry(function*() {
          mightError()
          return ok(1)
        })
      }
      `,
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
    {
      // safeTry with yield (not yield*) should still be handled explicitly
      code: `
      declare const mightError: () => Result<number, string>

      function consume(): Result<number, string> {
        return safeTry(function*() {
          yield mightError()
          return ok(1)
        })
      }
      `,
      errors: [{ messageId: MessageIds.MUST_USE }],
    },
  ],
})
