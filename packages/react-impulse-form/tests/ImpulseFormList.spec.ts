import { untrack, type Scope } from "react-impulse"
import { z } from "zod"

import {
  type ValidateStrategy,
  type Setter,
  type ImpulseFormValueOptions,
  type ImpulseFormListOptions,
  ImpulseFormList,
  ImpulseFormValue,
} from "../src"

import { arg, wait } from "./common"

beforeAll(() => {
  vi.useFakeTimers()
})

describe("ImpulseFormList#setElements()", () => {
  const setup = (elements: ReadonlyArray<ImpulseFormValue<number>>) => {
    return ImpulseFormList.of(elements)
  }

  const setupElement = (
    initial: number,
    options?: ImpulseFormValueOptions<number>,
  ) => {
    return ImpulseFormValue.of(initial, options)
  }

  it("matches the type definition", () => {
    const form = setup([setupElement(0)])

    expectTypeOf(form.setElements).toEqualTypeOf<
      (
        setter: Setter<
          ReadonlyArray<ImpulseFormValue<number>>,
          [ReadonlyArray<ImpulseFormValue<number>>, Scope]
        >,
      ) => void
    >()
  })

  it("replaces all elements", ({ scope }) => {
    const form = setup([setupElement(0), setupElement(1), setupElement(2)])

    form.setElements([setupElement(3), setupElement(4), setupElement(5)])
    expect(form.getInput(scope)).toStrictEqual([3, 4, 5])
  })

  it("filters some elements", ({ scope }) => {
    const form = setup([setupElement(0), setupElement(1), setupElement(2)])

    form.setElements((elements, scope) => {
      return elements.filter((element) => element.getInput(scope) > 1)
    })
    expect(form.getInput(scope)).toStrictEqual([2])
  })

  it("modifies existing elements", ({ scope }) => {
    const form = setup([setupElement(0), setupElement(1), setupElement(2)])

    form.setElements((elements) => [...elements, setupElement(3)])
    expect(form.getInput(scope)).toStrictEqual([0, 1, 2, 3])
  })

  it("attach the new elements to the form root", ({ scope }) => {
    const form = setup([setupElement(0), setupElement(1), setupElement(2)])

    form.setElements((current) => [...current, setupElement(3)])
    void form.submit()

    expect(form.getSubmitCount(scope)).toBe(1)
    expect(form.getElements(scope).at(0)!.getSubmitCount(scope)).toBe(1)
    expect(form.getElements(scope).at(3)!.getSubmitCount(scope)).toBe(1)
  })
})

describe("ImpulseFormList#getError()", () => {
  const setup = (elements: ReadonlyArray<ImpulseFormValue<number>>) => {
    return ImpulseFormList.of(elements)
  }

  const setupElement = (
    initial: number,
    options?: ImpulseFormValueOptions<number>,
  ) => {
    return ImpulseFormValue.of(initial, options)
  }

  it("matches the type definition", ({ scope }) => {
    const form = setup([setupElement(0)])

    expectTypeOf(form.getError).toEqualTypeOf<{
      (scope: Scope): null | ReadonlyArray<null | ReadonlyArray<string>>

      <TResult>(
        scope: Scope,
        select: (
          concise: null | ReadonlyArray<null | ReadonlyArray<string>>,
          verbose: ReadonlyArray<null | ReadonlyArray<string>>,
        ) => TResult,
      ): TResult
    }>()

    expectTypeOf(form.getElements(scope).at(0)!.getError).toEqualTypeOf<{
      (scope: Scope): null | ReadonlyArray<string>

      <TResult>(
        scope: Scope,
        select: (
          concise: null | ReadonlyArray<string>,
          verbose: null | ReadonlyArray<string>,
        ) => TResult,
      ): TResult
    }>()
  })

  it("returns null for empty list", ({ scope }) => {
    const form = setup([])

    expect(form.getError(scope)).toBeNull()
    expect(form.getError(scope, arg(0))).toBeNull()
    expect(form.getError(scope, arg(1))).toStrictEqual([])
  })

  it("returns null when none of the elements have errors", ({ scope }) => {
    const form = setup([setupElement(0), setupElement(1), setupElement(2)])

    expect(form.getError(scope)).toBeNull()
    expect(form.getError(scope, arg(0))).toBeNull()
    expect(form.getError(scope, arg(1))).toStrictEqual([null, null, null])
  })

  it("returns concise when at least one element has errors", ({ scope }) => {
    const form = setup([
      setupElement(0),
      setupElement(1),
      setupElement(2, { error: ["err"] }),
    ])

    const expected = [null, null, ["err"]]

    expect(form.getError(scope)).toStrictEqual(expected)
    expect(form.getError(scope, arg(0))).toStrictEqual(expected)
    expect(form.getError(scope, arg(1))).toStrictEqual(expected)
  })

  it("returns concise when all elements have errors", ({ scope }) => {
    const form = setup([
      setupElement(0, { error: ["err0"] }),
      setupElement(1, { error: ["err1"] }),
      setupElement(2, { error: ["err2"] }),
    ])

    const expected = [["err0"], ["err1"], ["err2"]]

    expect(form.getError(scope)).toStrictEqual(expected)
    expect(form.getError(scope, arg(0))).toStrictEqual(expected)
    expect(form.getError(scope, arg(1))).toStrictEqual(expected)
  })
})

describe("ImpulseFormList#setErrors()", () => {
  it("matches the type definition", ({ scope }) => {
    const form = ImpulseFormList.of([ImpulseFormValue.of(0)])

    expectTypeOf(form.setErrors).toEqualTypeOf<
      (
        setter: Setter<
          null | ReadonlyArray<
            undefined | Setter<null | ReadonlyArray<string>>
          >,
          [ReadonlyArray<null | ReadonlyArray<string>>]
        >,
      ) => void
    >()

    expectTypeOf(form.getElements(scope).at(0)!.setErrors).toEqualTypeOf<
      (setter: Setter<null | ReadonlyArray<string>>) => void
    >()
  })

  it("resets all errors with null", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { error: ["err0"] }),
      ImpulseFormValue.of(1, { error: ["err1"] }),
      ImpulseFormValue.of(2, { error: ["err2"] }),
    ])

    form.setErrors(null)
    expect(form.getError(scope)).toBeNull()
  })

  it("changes all errors", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { error: ["err0"] }),
      ImpulseFormValue.of(1, { error: ["err1"] }),
      ImpulseFormValue.of(2, { error: ["err2"] }),
    ])

    form.setErrors([["e0"], ["e1"], []])
    expect(form.getError(scope)).toStrictEqual([["e0"], ["e1"], null])
  })

  it("changes some errors", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { error: ["err0"] }),
      ImpulseFormValue.of(1, { error: ["err1"] }),
      ImpulseFormValue.of(2, { error: ["err2"] }),
    ])

    form.setErrors([(x) => [...x!, "x"], undefined, (x) => [...x!, "x"]])
    expect(form.getError(scope)).toStrictEqual([
      ["err0", "x"],
      ["err1"],
      ["err2", "x"],
    ])
  })
})

describe("ImpulseFormList#isValidated()", () => {
  const setup = (elements: ReadonlyArray<ImpulseFormValue<number>>) => {
    return ImpulseFormList.of(elements)
  }

  const setupElement = (
    initial: number,
    options?: ImpulseFormValueOptions<number>,
  ) => {
    return ImpulseFormValue.of(initial, options)
  }

  it("matches the type definition", ({ scope }) => {
    const form = setup([setupElement(0)])

    expectTypeOf(form.isValidated).toEqualTypeOf<{
      (scope: Scope): boolean

      <TResult>(
        scope: Scope,
        select: (
          concise: boolean | ReadonlyArray<boolean>,
          verbose: ReadonlyArray<boolean>,
        ) => TResult,
      ): TResult
    }>()

    expectTypeOf(form.getElements(scope).at(0)!.isValidated).toEqualTypeOf<{
      (scope: Scope): boolean

      <TResult>(
        scope: Scope,
        select: (concise: boolean, verbose: boolean) => TResult,
      ): TResult
    }>()
  })

  it("returns false for empty list", ({ scope }) => {
    const form = setup([])

    expect(form.isValidated(scope)).toBe(false)
    expect(form.isValidated(scope, arg(0))).toBe(false)
    expect(form.isValidated(scope, arg(1))).toStrictEqual([])
  })

  it("returns false when all elements are not validated", ({ scope }) => {
    const form = setup([setupElement(0), setupElement(1), setupElement(2)])

    expect(form.isValidated(scope)).toBe(false)
    expect(form.isValidated(scope, arg(0))).toBe(false)
    expect(form.isValidated(scope, arg(1))).toStrictEqual([false, false, false])
  })

  it("returns false when at least one element is not validated", ({
    scope,
  }) => {
    const form = setup([
      setupElement(0, { validateOn: "onInit" }),
      setupElement(1, { validateOn: "onInit" }),
      setupElement(2),
    ])

    expect(form.isValidated(scope)).toBe(false)
    expect(form.isValidated(scope, arg(0))).toStrictEqual([true, true, false])
    expect(form.isValidated(scope, arg(1))).toStrictEqual([true, true, false])
  })

  it("returns true when all elements are validated", ({ scope }) => {
    const form = setup([
      setupElement(0, { validateOn: "onInit" }),
      setupElement(1, { validateOn: "onInit" }),
      setupElement(2, { validateOn: "onInit" }),
    ])

    expect(form.isValidated(scope)).toBe(true)
    expect(form.isValidated(scope, arg(0))).toBe(true)
    expect(form.isValidated(scope, arg(1))).toStrictEqual([true, true, true])
  })

  it("returns false when at least one element has custom errors", ({
    scope,
  }) => {
    const form = setup([
      setupElement(0, { error: ["error"] }),
      setupElement(1),
      setupElement(2),
    ])

    expect(form.isValidated(scope)).toBe(false)
    expect(form.isValidated(scope, arg(0))).toStrictEqual([true, false, false])
    expect(form.isValidated(scope, arg(1))).toStrictEqual([true, false, false])
  })
})

describe("ImpulseFormList#getValidateOn()", () => {
  const setup = (
    elements: ReadonlyArray<ImpulseFormValue<number>>,
    options?: ImpulseFormListOptions<ImpulseFormValue<number>>,
  ) => {
    return ImpulseFormList.of(elements, options)
  }

  const setupElement = (
    initial: number,
    options?: ImpulseFormValueOptions<number>,
  ) => {
    return ImpulseFormValue.of(initial, options)
  }

  it("matches the type definition", ({ scope }) => {
    const form = setup([setupElement(0)])

    expectTypeOf(form.getValidateOn).toEqualTypeOf<{
      (scope: Scope): ValidateStrategy | ReadonlyArray<ValidateStrategy>

      <TResult>(
        scope: Scope,
        select: (
          concise: ValidateStrategy | ReadonlyArray<ValidateStrategy>,
          verbose: ReadonlyArray<ValidateStrategy>,
        ) => TResult,
      ): TResult
    }>()

    expectTypeOf(form.getElements(scope).at(0)!.getValidateOn).toEqualTypeOf<{
      (scope: Scope): ValidateStrategy

      <TResult>(
        scope: Scope,
        select: (
          concise: ValidateStrategy,
          verbose: ValidateStrategy,
        ) => TResult,
      ): TResult
    }>()
  })

  it("returns 'onTouch' for empty list", ({ scope }) => {
    const form = setup([])

    expect(form.getValidateOn(scope)).toBe("onTouch")
    expect(form.getValidateOn(scope, arg(0))).toBe("onTouch")
    expect(form.getValidateOn(scope, arg(1))).toStrictEqual([])
  })

  it("returns verbose when elements use more than a single strategy", ({
    scope,
  }) => {
    const form = setup([
      setupElement(0, { validateOn: "onInit" }),
      setupElement(1),
      setupElement(2, { validateOn: "onSubmit" }),
    ])

    const expected = ["onInit", "onTouch", "onSubmit"]

    expect(form.getValidateOn(scope)).toStrictEqual(expected)
    expect(form.getValidateOn(scope, arg(0))).toStrictEqual(expected)
    expect(form.getValidateOn(scope, arg(1))).toStrictEqual(expected)
  })

  it("returns concise when all elements use the same strategy", ({ scope }) => {
    const form = setup([
      setupElement(0, { validateOn: "onChange" }),
      setupElement(1, { validateOn: "onChange" }),
      setupElement(2, { validateOn: "onChange" }),
    ])

    expect(form.getValidateOn(scope)).toBe("onChange")
    expect(form.getValidateOn(scope, arg(0))).toBe("onChange")
    expect(form.getValidateOn(scope, arg(1))).toStrictEqual([
      "onChange",
      "onChange",
      "onChange",
    ])
  })
})

describe("ImpulseFormList#setValidateOn()", () => {
  it("matches the type definition", ({ scope }) => {
    const form = ImpulseFormList.of([ImpulseFormValue.of(0)])

    expectTypeOf(form.setValidateOn).toEqualTypeOf<
      (
        setter: Setter<
          | ValidateStrategy
          | ReadonlyArray<undefined | Setter<ValidateStrategy>>,
          [ReadonlyArray<ValidateStrategy>]
        >,
      ) => void
    >()

    expectTypeOf(form.getElements(scope).at(0)!.setValidateOn).toEqualTypeOf<
      (setter: Setter<ValidateStrategy>) => void
    >()
  })

  it("changes all items", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setValidateOn("onInit")
    expect(form.getValidateOn(scope)).toBe("onInit")

    form.setValidateOn("onSubmit")
    expect(form.getValidateOn(scope)).toBe("onSubmit")
  })
})

describe("ImpulseFormList#isTouched()", () => {
  const setup = (elements: ReadonlyArray<ImpulseFormValue<number>>) => {
    return ImpulseFormList.of(elements)
  }

  const setupElement = (
    initial: number,
    options?: ImpulseFormValueOptions<number>,
  ) => {
    return ImpulseFormValue.of(initial, options)
  }

  it("matches the type definition", ({ scope }) => {
    const form = setup([setupElement(0)])

    expectTypeOf(form.isTouched).toEqualTypeOf<{
      (scope: Scope): boolean

      <TResult>(
        scope: Scope,
        select: (
          concise: boolean | ReadonlyArray<boolean>,
          verbose: ReadonlyArray<boolean>,
        ) => TResult,
      ): TResult
    }>()

    expectTypeOf(form.getElements(scope).at(0)!.isTouched).toEqualTypeOf<{
      (scope: Scope): boolean

      <TResult>(
        scope: Scope,
        select: (concise: boolean, verbose: boolean) => TResult,
      ): TResult
    }>()
  })

  it("returns false for empty list", ({ scope }) => {
    const form = setup([])

    expect(form.isTouched(scope)).toBe(false)
    expect(form.isTouched(scope, arg(0))).toBe(false)
    expect(form.isTouched(scope, arg(1))).toStrictEqual([])
  })

  it("returns false when all elements are not touched", ({ scope }) => {
    const form = setup([setupElement(0), setupElement(1), setupElement(2)])

    expect(form.isTouched(scope)).toBe(false)
    expect(form.isTouched(scope, arg(0))).toBe(false)
    expect(form.isTouched(scope, arg(1))).toStrictEqual([false, false, false])
  })

  it("returns true when at least one element is touched", ({ scope }) => {
    const form = setup([
      setupElement(0),
      setupElement(1),
      setupElement(2, { touched: true }),
    ])

    expect(form.isTouched(scope)).toBe(true)
    expect(form.isTouched(scope, arg(0))).toStrictEqual([false, false, true])
    expect(form.isTouched(scope, arg(1))).toStrictEqual([false, false, true])
  })

  it("returns true when all elements are touched", ({ scope }) => {
    const form = setup([
      setupElement(0, { touched: true }),
      setupElement(1, { touched: true }),
      setupElement(2, { touched: true }),
    ])

    expect(form.isTouched(scope)).toBe(true)
    expect(form.isTouched(scope, arg(0))).toBe(true)
    expect(form.isTouched(scope, arg(1))).toStrictEqual([true, true, true])
  })
})

describe("ImpulseFormList#setTouched()", () => {
  it("matches the type definition", ({ scope }) => {
    const form = ImpulseFormList.of([ImpulseFormValue.of(0)])

    expectTypeOf(form.setTouched).toEqualTypeOf<
      (
        setter: Setter<
          boolean | ReadonlyArray<undefined | Setter<boolean>>,
          [ReadonlyArray<boolean>]
        >,
      ) => void
    >()

    expectTypeOf(form.getElements(scope).at(0)!.setTouched).toEqualTypeOf<
      (setter: Setter<boolean>) => void
    >()
  })

  it("touches all items", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setTouched(true)
    expect(form.isTouched(scope)).toBe(true)

    form.setTouched(false)
    expect(form.isTouched(scope)).toBe(false)
  })
})

describe("ImpulseFormList#reset()", () => {
  it("matches the type definition", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, {
        schema: z.number().transform((x) => x.toFixed()),
      }),
    ])

    expectTypeOf(form.reset).toEqualTypeOf<
      (
        resetter?: Setter<
          ReadonlyArray<undefined | Setter<number, [number, number]>>,
          [ReadonlyArray<number>, ReadonlyArray<number>]
        >,
      ) => void
    >()

    expectTypeOf(form.getElements(scope).at(0)!.reset).toEqualTypeOf<
      (resetter?: Setter<number, [number, number]>) => void
    >()
  })

  it("sets initial values for all items", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { initial: 1 }),
      ImpulseFormValue.of(1, { initial: 2 }),
      ImpulseFormValue.of(2, { initial: 3 }),
    ])

    form.reset()
    expect(form.getOutput(scope)).toStrictEqual([1, 2, 3])
  })

  it("clears custom errors", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { error: ["error"] }),
      ImpulseFormValue.of(1, { error: ["error"] }),
      ImpulseFormValue.of(2, { error: ["error"] }),
    ])

    form.reset()
    expect(form.getError(scope)).toBeNull()
  })

  it("resets isValidated state", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setTouched(true)

    expect(form.isValidated(scope)).toBe(true)
    form.reset()
    expect(form.isValidated(scope)).toBe(false)
  })

  it("provides the initial value to the element resetter 1st argument", ({
    scope,
  }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { initial: 1 }),
      ImpulseFormValue.of(1, { initial: 2 }),
      ImpulseFormValue.of(2, { initial: 3 }),
    ])

    form.reset((initial) => initial.map((x) => x + 1))
    expect(form.getOutput(scope)).toStrictEqual([2, 3, 4])
  })

  it("provides the original value to the resetter 2nd argument", ({
    scope,
  }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { initial: 1 }),
      ImpulseFormValue.of(1, { initial: 2 }),
      ImpulseFormValue.of(2, { initial: 3 }),
    ])

    form.reset((_, original) => original.map((x) => x + 1))
    expect(form.getInput(scope)).toStrictEqual([1, 2, 3])
  })

  it("restores removed elements", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { initial: 1 }),
      ImpulseFormValue.of(1, { initial: 2 }),
      ImpulseFormValue.of(2, { initial: 3 }),
    ])

    form.setElements((elements) => elements.slice(0, 2))
    expect(form.getInput(scope)).toStrictEqual([0, 1])
    expect(form.getInitial(scope)).toStrictEqual([1, 2, 3])

    form.reset()
    expect(form.getInput(scope)).toStrictEqual([1, 2, 3])
    expect(form.getInitial(scope)).toStrictEqual([1, 2, 3])
  })

  it("restores all elements", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { initial: 1 }),
      ImpulseFormValue.of(1, { initial: 2 }),
      ImpulseFormValue.of(2, { initial: 3 }),
    ])

    form.setElements([])
    expect(form.getInput(scope)).toStrictEqual([])
    expect(form.getInitial(scope)).toStrictEqual([1, 2, 3])

    form.reset()
    expect(form.getInput(scope)).toStrictEqual([1, 2, 3])
    expect(form.getInitial(scope)).toStrictEqual([1, 2, 3])
  })

  it("removes added element", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { initial: 1 }),
      ImpulseFormValue.of(1, { initial: 2 }),
      ImpulseFormValue.of(2, { initial: 3 }),
    ])

    form.setElements((elements) => [
      ...elements,
      ImpulseFormValue.of(3, { initial: 4 }),
    ])
    expect(form.getInput(scope)).toStrictEqual([0, 1, 2, 3])
    expect(form.getInitial(scope)).toStrictEqual([1, 2, 3])

    form.reset()
    expect(form.getInput(scope)).toStrictEqual([1, 2, 3])
    expect(form.getInitial(scope)).toStrictEqual([1, 2, 3])
  })

  it("removes all elements", ({ scope }) => {
    const form = ImpulseFormList.of<ImpulseFormValue<number>>([])

    form.setElements([
      ImpulseFormValue.of(0, { initial: 1 }),
      ImpulseFormValue.of(1, { initial: 2 }),
      ImpulseFormValue.of(2, { initial: 3 }),
    ])
    expect(form.getInput(scope)).toStrictEqual([0, 1, 2])
    expect(form.getInitial(scope)).toStrictEqual([])

    form.reset()
    expect(form.getInput(scope)).toStrictEqual([])
    expect(form.getInitial(scope)).toStrictEqual([])
  })

  it("updates validateOn for restored elements", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { validateOn: "onChange" }),
      ImpulseFormValue.of(1, { validateOn: "onChange" }),
      ImpulseFormValue.of(2, { validateOn: "onChange" }),
    ])

    form.setElements([ImpulseFormValue.of(0)])
    form.setValidateOn("onInit")
    expect(form.getValidateOn(scope)).toBe("onInit")

    form.reset()
    expect(form.getValidateOn(scope)).toBe("onInit")
  })

  it("updates submit count for restored elements", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setElements([ImpulseFormValue.of(0)])
    void form.submit()
    expect(form.getSubmitCount(scope)).toBe(1)
    expect(
      form.getElements(scope).map((element) => element.getSubmitCount(scope)),
    ).toStrictEqual([1])

    form.reset()
    expect(form.getSubmitCount(scope)).toBe(1)
    expect(
      form.getElements(scope).map((element) => element.getSubmitCount(scope)),
    ).toStrictEqual([1, 1, 1])
  })

  it("updates isSubmitting for restored elements", async ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.onSubmit(() => wait(1000))

    form.setElements([ImpulseFormValue.of(0)])
    void form.submit()
    expect(form.isSubmitting(scope)).toBe(true)
    expect(
      form.getElements(scope).map((element) => element.isSubmitting(scope)),
    ).toStrictEqual([true])

    form.reset()
    expect(form.isSubmitting(scope)).toBe(true)
    expect(
      form.getElements(scope).map((element) => element.isSubmitting(scope)),
    ).toStrictEqual([true, true, true])

    await vi.advanceTimersByTimeAsync(1000)
    expect(form.isSubmitting(scope)).toBe(false)
    expect(
      form.getElements(scope).map((element) => element.isSubmitting(scope)),
    ).toStrictEqual([false, false, false])
  })
})

describe("ImpulseFormList#getOutput()", () => {
  const setup = (elements: ReadonlyArray<ImpulseFormValue<number, string>>) => {
    return ImpulseFormList.of(elements, {
      validateOn: "onInit",
    })
  }

  const setupElement = (initial: number) => {
    return ImpulseFormValue.of(initial, {
      schema: z
        .number()
        .min(1)
        .transform((x) => x.toFixed()),
    })
  }

  it("matches the type definition", ({ scope }) => {
    const form = setup([setupElement(0)])

    expectTypeOf(form.getOutput).toEqualTypeOf<{
      (scope: Scope): null | ReadonlyArray<string>

      <TResult>(
        scope: Scope,
        select: (
          concise: null | ReadonlyArray<string>,
          verbose: ReadonlyArray<null | string>,
        ) => TResult,
      ): TResult
    }>()

    expectTypeOf(form.getElements(scope).at(0)!.getOutput).toEqualTypeOf<{
      (scope: Scope): null | string

      <TResult>(
        scope: Scope,
        select: (concise: null | string, verbose: null | string) => TResult,
      ): TResult
    }>()
  })

  it("returns all items when valid", ({ scope }) => {
    const form = setup([setupElement(1), setupElement(2), setupElement(3)])

    expect(form.getOutput(scope)).toStrictEqual(["1", "2", "3"])
    expect(form.getOutput(scope, arg(0))).toStrictEqual(["1", "2", "3"])
    expect(form.getOutput(scope, arg(1))).toStrictEqual(["1", "2", "3"])
  })

  it("returns empty array for empty list", ({ scope }) => {
    const form = setup([])

    expect(form.getOutput(scope)).toStrictEqual([])
    expect(form.getOutput(scope, arg(0))).toStrictEqual([])
    expect(form.getOutput(scope, arg(1))).toStrictEqual([])
  })

  it("returns null if a single element is not valid", ({ scope }) => {
    const form = setup([setupElement(0)])

    expect(form.getOutput(scope)).toBeNull()
    expect(form.getOutput(scope, arg(0))).toBeNull()
    expect(form.getOutput(scope, arg(1))).toStrictEqual([null])
  })

  it("returns null if at least one element is not valid", ({ scope }) => {
    const form = setup([setupElement(1), setupElement(0), setupElement(3)])

    expect(form.getOutput(scope)).toBeNull()
    expect(form.getOutput(scope, arg(0))).toBeNull()
    expect(form.getOutput(scope, arg(1))).toStrictEqual(["1", null, "3"])
  })
})

describe("ImpulseFormList#getInput()", () => {
  it("matches the type definition", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, {
        schema: z.number().transform((x) => x.toFixed()),
      }),
    ])

    expectTypeOf(form.getInput).toEqualTypeOf<
      (scope: Scope) => ReadonlyArray<number>
    >()

    expectTypeOf(form.getElements(scope).at(0)!.getInput).toEqualTypeOf<
      (scope: Scope) => number
    >()
  })

  it("returns empty array for empty list", ({ scope }) => {
    const form = ImpulseFormList.of([])

    expect(form.getInput(scope)).toStrictEqual([])
  })

  it("returns an array of original values", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    expect(form.getInput(scope)).toStrictEqual([0, 1, 2])
  })
})

describe("ImpulseFormList#setInput()", () => {
  it("matches the type definition", ({ scope }) => {
    const form = ImpulseFormList.of([ImpulseFormValue.of(0)])

    expectTypeOf(form.setInput).toEqualTypeOf<
      (
        setter: Setter<
          ReadonlyArray<undefined | Setter<number, [number, number]>>,
          [ReadonlyArray<number>, ReadonlyArray<number>]
        >,
      ) => void
    >()

    expectTypeOf(form.getElements(scope).at(0)!.setInput).toEqualTypeOf<
      (setter: Setter<number, [number, number]>) => void
    >()
  })

  it("changes all items", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setInput([3, 4, 5])
    expect(form.getInput(scope)).toStrictEqual([3, 4, 5])
  })

  it("changes nothing when setting an empty list", ({ scope }) => {
    const form = ImpulseFormList.of([ImpulseFormValue.of(0)])

    form.setInput([])
    expect(form.getInput(scope)).toStrictEqual([0])
  })

  it("keeps the list empty", ({ scope }) => {
    const form = ImpulseFormList.of<ImpulseFormValue<number>>([])

    form.setInput([0, 1])
    expect(form.getInput(scope)).toStrictEqual([])
  })

  it("changes only defined items", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setInput([3])
    expect(form.getInput(scope)).toStrictEqual([3, 1, 2])

    form.setInput([undefined, undefined, 4])
    expect(form.getInput(scope)).toStrictEqual([3, 1, 4])
  })

  it("does not extend existing list", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setInput([3, 4, 5, 6])
    expect(form.getInput(scope)).toStrictEqual([3, 4, 5])
  })

  it("passes the list in the transform function", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setInput((elements) => elements.map((x) => x + 1))
    expect(form.getInput(scope)).toStrictEqual([1, 2, 3])
  })

  it("passes an element in the transform function", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setInput([undefined, (x) => x + 3])
    expect(form.getInput(scope)).toStrictEqual([0, 4, 2])
  })

  it("passes an element in the list transform function", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setInput((elements) => elements.map(() => (x) => x + 1))
    expect(form.getInput(scope)).toStrictEqual([1, 2, 3])
  })
})

describe("ImpulseFormList#getInitial()", () => {
  it("matches the type definition", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, {
        schema: z.number().transform((x) => x.toFixed()),
      }),
    ])

    expectTypeOf(form.getInitial).toEqualTypeOf<
      (scope: Scope) => ReadonlyArray<number>
    >()

    expectTypeOf(form.getElements(scope).at(0)!.getInitial).toEqualTypeOf<
      (scope: Scope) => number
    >()
  })

  it("returns empty array for empty list", ({ scope }) => {
    const form = ImpulseFormList.of([])

    expect(form.getInitial(scope)).toStrictEqual([])
  })

  it("returns an array of original values", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { initial: 3 }),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2, { initial: 4 }),
    ])

    expect(form.getInitial(scope)).toStrictEqual([3, 1, 4])
  })

  it("returns nested list's values", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormList.of([ImpulseFormValue.of(1)]),
      ImpulseFormList.of([ImpulseFormValue.of(2), ImpulseFormValue.of(3)]),
    ])

    expect(form.getInitial(scope)).toStrictEqual([[1], [2, 3]])
  })
})

describe("ImpulseFormList#setInitial()", () => {
  it("matches the type definition", ({ scope }) => {
    const form = ImpulseFormList.of([ImpulseFormValue.of(0)])

    expectTypeOf(form.setInitial).toEqualTypeOf<
      (
        setter: Setter<
          ReadonlyArray<undefined | Setter<number, [number, number]>>,
          [ReadonlyArray<number>, ReadonlyArray<number>]
        >,
      ) => void
    >()

    expectTypeOf(form.getElements(scope).at(0)!.setInitial).toEqualTypeOf<
      (setter: Setter<number, [number, number]>) => void
    >()
  })

  it("changes all items", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
      ImpulseFormValue.of(2),
    ])

    form.setInitial([3, 4, 5])
    expect(form.getInitial(scope)).toStrictEqual([3, 4, 5])
    expect(
      form.getElements(scope).map((element) => element.getInitial(scope)),
    ).toStrictEqual([3, 4, 5])
  })

  it("adds an added element's initial", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
    ])

    form.setElements((elements) => [...elements, ImpulseFormValue.of(2)])

    expect(form.getInitial(scope)).toStrictEqual([0, 1])
    form.setInitial([3, 4, 5])
    expect(form.getInitial(scope)).toStrictEqual([3, 4, 5])
    expect(
      form.getElements(scope).map((element) => element.getInitial(scope)),
    ).toStrictEqual([3, 4, 5])
  })

  it("keeps a removed element's initial", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
    ])

    form.setElements((elements) => elements.slice(0, 1))
    expect(form.getOutput(scope)).toStrictEqual([0])

    expect(form.getInitial(scope)).toStrictEqual([0, 1])
    form.setInitial([3, 4])
    expect(form.getInitial(scope)).toStrictEqual([3, 4])
    expect(
      form.getElements(scope).map((element) => element.getInitial(scope)),
    ).toStrictEqual([3])
  })

  it("does not add initial when neither initial nor current value exist", ({
    scope,
  }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0),
      ImpulseFormValue.of(1),
    ])

    form.setInitial([3, 4, 5])
    expect(form.getInitial(scope)).toStrictEqual([3, 4])

    expect(
      form.getElements(scope).map((element) => element.getInitial(scope)),
    ).toStrictEqual([3, 4])
  })

  it("removes initials by shorter list", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { initial: 1 }),
      ImpulseFormValue.of(1, { initial: 2 }),
      ImpulseFormValue.of(2, { initial: 3 }),
    ])

    form.setInitial([3, 4])
    expect(form.getInitial(scope)).toStrictEqual([3, 4])
    expect(
      form.getElements(scope).map((element) => element.getInitial(scope)),
    ).toStrictEqual([3, 4, 3])
  })

  it('do not remove initials by "undefined" in the list', ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { initial: 1 }),
      ImpulseFormValue.of(1, { initial: 2 }),
      ImpulseFormValue.of(2, { initial: 3 }),
    ])

    form.setInitial([undefined, 4, undefined])
    expect(form.getInitial(scope)).toStrictEqual([1, 4, 3])
    expect(
      form.getElements(scope).map((element) => element.getInitial(scope)),
    ).toStrictEqual([1, 4, 3])
  })

  it("remove all initials by empty list", ({ scope }) => {
    const form = ImpulseFormList.of([
      ImpulseFormValue.of(0, { initial: 1 }),
      ImpulseFormValue.of(1, { initial: 2 }),
      ImpulseFormValue.of(2, { initial: 3 }),
    ])

    form.setInitial([])
    expect(form.getInitial(scope)).toStrictEqual([])
    expect(
      form.getElements(scope).map((element) => element.getInitial(scope)),
    ).toStrictEqual([1, 2, 3])
  })

  it("overrides initial values on init", ({ scope }) => {
    const form = ImpulseFormList.of(
      [
        ImpulseFormValue.of(0, { initial: 1 }),
        ImpulseFormValue.of(1, { initial: 2 }),
        ImpulseFormValue.of(2, { initial: 3 }),
      ],
      {
        initial: [4, 5, 6],
      },
    )

    expect(form.getInitial(scope)).toStrictEqual([4, 5, 6])
    expect(
      form.getElements(scope).map((element) => element.getInitial(scope)),
    ).toStrictEqual([4, 5, 6])
  })

  it("changed list's initial values when element's initial is changed", ({
    scope,
  }) => {
    const form = ImpulseFormList.of(
      [ImpulseFormValue.of(0), ImpulseFormValue.of(1), ImpulseFormValue.of(2)],
      {
        initial: [3, 4, 5],
      },
    )

    form.getElements(scope).at(1)!.setInitial(6)
    expect(form.getInitial(scope)).toStrictEqual([3, 6, 5])
    expect(
      form.getElements(scope).map((element) => element.getInitial(scope)),
    ).toStrictEqual([3, 6, 5])
  })
})

describe("ImpulseFormList#focusFirstInvalidValue()", () => {
  const setup = (
    options?: ImpulseFormListOptions<ImpulseFormValue<number>>,
  ) => {
    const form = ImpulseFormList.of(
      [ImpulseFormValue.of(0), ImpulseFormValue.of(1), ImpulseFormValue.of(2)],
      options,
    )

    const listener_0 = vi.fn()
    const listener_1 = vi.fn()
    const listener_2 = vi.fn()

    const elements = untrack((scope) => form.getElements(scope))

    elements.at(0)?.onFocusWhenInvalid(listener_0)
    elements.at(1)?.onFocusWhenInvalid(listener_1)
    elements.at(2)?.onFocusWhenInvalid(listener_2)

    return [
      form,
      {
        listener_0,
        listener_1,
        listener_2,
      },
    ] as const
  }

  it("does not call listeners on init", () => {
    const [, { listener_0, listener_1, listener_2 }] = setup({
      errors: [["error0"], ["error1"], ["error2"]],
    })

    expect(listener_0).not.toHaveBeenCalled()
    expect(listener_1).not.toHaveBeenCalled()
    expect(listener_2).not.toHaveBeenCalled()
  })

  it("does not focus any when all valid", () => {
    const [form, { listener_0, listener_1, listener_2 }] = setup()

    form.focusFirstInvalidValue()

    expect(listener_0).not.toHaveBeenCalled()
    expect(listener_1).not.toHaveBeenCalled()
    expect(listener_2).not.toHaveBeenCalled()
  })

  it("focuses the first invalid element", () => {
    const [form, { listener_0, listener_1, listener_2 }] = setup({
      errors: [["error0"], ["error1"], ["error2"]],
    })

    form.focusFirstInvalidValue()

    expect(listener_0).toHaveBeenCalledOnce()
    expect(listener_0).toHaveBeenLastCalledWith(["error0"])
    expect(listener_1).not.toHaveBeenCalled()
    expect(listener_2).not.toHaveBeenCalled()
  })

  it("calls the only invalid", () => {
    const [form, { listener_0, listener_1, listener_2 }] = setup({
      errors: [undefined, ["error1"]],
    })

    form.focusFirstInvalidValue()

    expect(listener_0).not.toHaveBeenCalled()
    expect(listener_1).toHaveBeenCalledOnce()
    expect(listener_1).toHaveBeenLastCalledWith(["error1"])
    expect(listener_2).not.toHaveBeenCalled()
  })
})

describe("ImpulseFormList#onSubmit()", () => {
  const setup = (
    options?: ImpulseFormListOptions<ImpulseFormValue<number>>,
  ) => {
    const form = ImpulseFormList.of(
      [ImpulseFormValue.of(1), ImpulseFormValue.of(2), ImpulseFormValue.of(3)],
      options,
    )

    const listener_0 = vi.fn()
    const listener_1 = vi.fn()
    const listener_2 = vi.fn()
    const listener_3 = vi.fn()

    const elements = untrack((scope) => form.getElements(scope))

    form.onSubmit(listener_0)
    elements.at(0)?.onSubmit(listener_1)
    elements.at(1)?.onSubmit(listener_2)
    elements.at(2)?.onSubmit(listener_3)

    return [
      form,
      {
        listener_0,
        listener_1,
        listener_2,
        listener_3,
      },
    ] as const
  }

  it("does not call the listeners on init", () => {
    const [, { listener_0, listener_1, listener_2, listener_3 }] = setup()

    expect(listener_0).not.toHaveBeenCalled()
    expect(listener_1).not.toHaveBeenCalled()
    expect(listener_2).not.toHaveBeenCalled()
    expect(listener_3).not.toHaveBeenCalled()
  })

  it("provides values to the listeners", () => {
    const [form, { listener_0, listener_1, listener_2, listener_3 }] = setup()

    void form.submit()

    expect(listener_0).toHaveBeenCalledOnce()
    expect(listener_0).toHaveBeenLastCalledWith([1, 2, 3])

    expect(listener_1).toHaveBeenCalledOnce()
    expect(listener_1).toHaveBeenLastCalledWith(1)

    expect(listener_2).toHaveBeenCalledOnce()
    expect(listener_2).toHaveBeenLastCalledWith(2)

    expect(listener_3).toHaveBeenCalledOnce()
    expect(listener_3).toHaveBeenLastCalledWith(3)
  })
})
