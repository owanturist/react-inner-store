import { z } from "zod"
import type { Scope } from "react-impulse"

import {
  type ImpulseFormValueOptions,
  type ValidateStrategy,
  ImpulseFormValue,
} from "../../src"

const setup = (options?: ImpulseFormValueOptions<string, number>) => {
  return ImpulseFormValue.of("y", {
    schema: z.string().min(1).pipe(z.coerce.number()),
    ...options,
  })
}

const isValidatedDefault = (
  scope: Scope,
  value: ImpulseFormValue<string, number>,
) => value.isValidated(scope)

const isValidatedConcise = (
  scope: Scope,
  value: ImpulseFormValue<string, number>,
) => value.isValidated(scope, (concise) => concise)

const isValidatedVerbose = (
  scope: Scope,
  value: ImpulseFormValue<string, number>,
) => value.isValidated(scope, (_, verbose) => verbose)

it("matches the type signature", () => {
  const form = setup()

  expectTypeOf(form.isValidated).toEqualTypeOf<{
    (scope: Scope): boolean

    <TResult>(
      scope: Scope,
      select: (concise: boolean, verbose: boolean) => TResult,
    ): TResult
  }>()
})

describe.each([
  ["isValidated(scope)", isValidatedDefault],
  ["isValidated(scope, (concise) => concise)", isValidatedConcise],
  ["isValidated(scope, (_, verbose) => concise)", isValidatedVerbose],
])("%s", (_, isValidated) => {
  it("returns boolean value", ({ scope }) => {
    const value = setup()

    expectTypeOf(isValidated(scope, value)).toBeBoolean()
  })

  describe("when onInit", () => {
    it("marks as validated on init", ({ scope }) => {
      const value = setup({ validateOn: "onInit" })

      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })
  })

  describe("when onTouch", () => {
    it("marks as validated on init when touched=true", ({ scope }) => {
      const value = setup({ validateOn: "onTouch", touched: true })

      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })

    it("does not mark validated on setTouched(false)", ({ scope }) => {
      const value = setup({ validateOn: "onTouch" })

      value.setTouched(false)
      expect(isValidated(scope, value)).toBe(false)
      expect(value.getError(scope)).toBeNull()
    })

    it("marks as validated on setTouched(true)", ({ scope }) => {
      const value = setup({ validateOn: "onTouch" })

      value.setTouched(true)
      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })

    it("keeps validated on setTouched(false)", ({ scope }) => {
      const value = setup({ validateOn: "onTouch", touched: true })

      value.setTouched(false)
      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })

    it("keeps validated on setValidateOn(onTouch)", ({ scope }) => {
      const value = setup({ touched: true, validateOn: "onTouch" })

      value.setTouched(false)
      value.setValidateOn("onTouch")
      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })

    it("does not mark as validated on change", ({ scope }) => {
      const value = setup({ validateOn: "onTouch" })

      value.setInput("x")
      expect(isValidated(scope, value)).toBe(false)
      expect(value.getError(scope)).toBeNull()
    })
  })

  describe("when onChange", () => {
    it("marks as validated on init when dirty", ({ scope }) => {
      const value = setup({ validateOn: "onChange", initial: "x" })

      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })

    it("marks as validated on change", ({ scope }) => {
      const value = setup({ validateOn: "onChange" })

      value.setInput("x")
      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })

    it("marks as validated on initial change", ({ scope }) => {
      const value = setup({ validateOn: "onChange" })

      value.setInitial("x")
      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })

    it("does not mark as validated for the same value", ({ scope }) => {
      const value = setup({ validateOn: "onChange" })

      value.setInput("y")
      expect(isValidated(scope, value)).toBe(false)
      expect(value.getError(scope)).toBeNull()
    })

    it("keeps validated when the value changes to initial", ({ scope }) => {
      const value = setup({ validateOn: "onChange" })

      value.setInput("x")
      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])

      value.setInput(value.getInitial(scope))
      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })

    it("keeps validated on setValidateOn(onChange)", ({ scope }) => {
      const value = setup({ initial: "x", validateOn: "onChange" })

      value.setInput(value.getInitial(scope))
      value.setValidateOn("onChange")
      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })

    it("is not validated on touch", ({ scope }) => {
      const value = setup({ validateOn: "onChange" })

      value.setTouched(true)
      expect(isValidated(scope, value)).toBe(false)
      expect(value.getError(scope)).toBeNull()
    })
  })

  describe("when onSubmit", () => {
    it("does not mark as validated on touch", ({ scope }) => {
      const value = setup({ validateOn: "onSubmit" })

      value.setTouched(true)
      expect(isValidated(scope, value)).toBe(false)
      expect(value.getError(scope)).toBeNull()
    })

    it("does not mark as validated on change", ({ scope }) => {
      const value = setup({ validateOn: "onSubmit" })

      value.setInput("x")
      expect(isValidated(scope, value)).toBe(false)
      expect(value.getError(scope)).toBeNull()
    })
  })

  describe.each([
    "onTouch",
    "onChange",
    "onSubmit",
  ] satisfies Array<ValidateStrategy>)("when %s", (validateOn) => {
    it("does not mark as validated on init", ({ scope }) => {
      const value = setup({ validateOn })

      expect(isValidated(scope, value)).toBe(false)
      expect(value.getError(scope)).toBeNull()
    })

    it("marks as validated on submit", async ({ scope }) => {
      const value = setup({ validateOn })

      await value.submit()
      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual([
        "Expected number, received nan",
      ])
    })

    it("marks as validated when initialized with custom error", ({ scope }) => {
      const value = setup({ validateOn, error: ["error"] })

      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual(["error"])
    })

    it("marks as validated when custom error set", ({ scope }) => {
      const value = setup({ validateOn })

      value.setErrors(["error"])
      expect(isValidated(scope, value)).toBe(true)
      expect(value.getError(scope)).toStrictEqual(["error"])
    })

    it("unmarks as validated when custom error is removed", ({ scope }) => {
      const value = setup({ validateOn, error: ["error"] })

      value.setErrors(null)
      expect(isValidated(scope, value)).toBe(false)
      expect(value.getError(scope)).toBeNull()
    })
  })
})
