import { z } from "zod"

import { ImpulseFormValue } from "../../src"

describe("ImpulseFormValueOptions.isInputDirty", () => {
  it("uses Object.is when not provided", ({ scope }) => {
    const value = ImpulseFormValue.of({ value: "value" })

    expect(value.isDirty(scope)).toBe(false)

    value.setInput({ value: "value" })
    expect(value.isDirty(scope)).toBe(true)
  })

  it("fallbacks to isInputEqual when not provided", ({ scope }) => {
    const value = ImpulseFormValue.of(
      { value: "value" },
      {
        isInputEqual: (left, right) => left.value === right.value,
      },
    )

    expect(value.isDirty(scope)).toBe(false)

    value.setInput({ value: "value" })
    expect(value.isDirty(scope)).toBe(false)
  })

  it("takes isInputDirty over isInputEqual", ({ scope }) => {
    const value = ImpulseFormValue.of(
      { value: "value" },
      {
        isInputEqual: (left, right) => left.value === right.value,
        isInputDirty: (left, right) => left.value.trim() !== right.value.trim(),
      },
    )

    expect(value.isDirty(scope)).toBe(false)

    value.setInput({ value: "value " })
    expect(value.isDirty(scope)).toBe(false)

    value.setInput({ value: "value 1" })
    expect(value.isDirty(scope)).toBe(true)
  })

  it("returns not dirty when isInputDirty returns false", ({ scope }) => {
    const value = ImpulseFormValue.of("", {
      isInputDirty: (left, right) => left.trim() !== right.trim(),
    })

    expect(value.isDirty(scope)).toBe(false)

    value.setInput(" ")
    expect(value.isDirty(scope)).toBe(false)
  })

  it("returns dirty when isInputDirty returns true", ({ scope }) => {
    const value = ImpulseFormValue.of("", {
      isInputDirty: (left, right) => left.trim() !== right.trim(),
    })

    expect(value.isDirty(scope)).toBe(false)

    value.setInput(" s")
    expect(value.isDirty(scope)).toBe(true)
  })
})

describe("when TError is not defined", () => {
  it("creates ImpulseFormValue<TInput>", ({ scope }) => {
    const value = ImpulseFormValue.of("value")

    expectTypeOf(value).toEqualTypeOf<ImpulseFormValue<string>>()
    expectTypeOf(value.getOutput(scope)).toEqualTypeOf<string>()
    expectTypeOf(value.getError(scope)).toEqualTypeOf<null>()
  })
})

describe("when TError is defined as null", () => {
  it("creates ImpulseFormValue<TInput>", ({ scope }) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
    const value = ImpulseFormValue.of<string, null>("value")

    expectTypeOf(value).toEqualTypeOf<ImpulseFormValue<string>>()
    expectTypeOf(value.getOutput(scope)).toEqualTypeOf<string>()
    expectTypeOf(value.getError(scope)).toEqualTypeOf<null>()
  })
})

describe("when TError is defined as a type without an initial value", () => {
  it("creates ImpulseFormValue<TInput, TError>", ({ scope }) => {
    const value = ImpulseFormValue.of<string, number>("value")

    expectTypeOf(value).toEqualTypeOf<ImpulseFormValue<string, number>>()
    expectTypeOf(value.getOutput(scope)).toEqualTypeOf<null | string>()
    expectTypeOf(value.getError(scope)).toEqualTypeOf<null | number>()
  })
})

describe("when ImpulseFormValueOptions.error is defined", () => {
  it("creates ImpulseFormValue<TInput, TError>", ({ scope }) => {
    const value = ImpulseFormValue.of("value", {
      error: 1,
    })

    expectTypeOf(value).toEqualTypeOf<ImpulseFormValue<string, number>>()
    expectTypeOf(value.getOutput(scope)).toEqualTypeOf<null | string>()
    expectTypeOf(value.getError(scope)).toEqualTypeOf<null | number>()
  })
})

describe("when ImpulseFormValueOptions.schema is defined", () => {
  it("creates ImpulseFormValue<TInput, ReadonlyArray<string>>", ({ scope }) => {
    const value = ImpulseFormValue.of("value", {
      schema: z.string().min(2),
    })

    expectTypeOf(value).toEqualTypeOf<
      ImpulseFormValue<string, ReadonlyArray<string>>
    >()
    expectTypeOf(value.getOutput(scope)).toEqualTypeOf<null | string>()
    expectTypeOf(
      value.getError(scope),
    ).toEqualTypeOf<null | ReadonlyArray<string>>()
  })

  it("allows setting ImpulseFormValueOptions.error as ReadonlyArray<string>", ({
    scope,
  }) => {
    const value = ImpulseFormValue.of("value", {
      schema: z.string().min(2),
      error: ["error"],
    })

    expectTypeOf(value).toEqualTypeOf<
      ImpulseFormValue<string, ReadonlyArray<string>>
    >()
    expectTypeOf(value.getOutput(scope)).toEqualTypeOf<null | string>()
    expectTypeOf(
      value.getError(scope),
    ).toEqualTypeOf<null | ReadonlyArray<string>>()
  })

  it("does not allow setting ImpulseFormValueOptions.error as anything else rather ReadonlyArray<string>", () => {
    // @ts-expect-error error must be ReadonlyArray<string>
    const value = ImpulseFormValue.of("value", {
      schema: z.string().min(2),
      error: 123,
    })

    expectTypeOf(value).toEqualTypeOf<ImpulseFormValue<string, number>>()
  })
})

describe("when ImpulseFormValueOptions.validate is defined", () => {
  it("creates ImpulseFormValue<TInput, TError>", ({ scope }) => {
    const value = ImpulseFormValue.of("value", {
      validate: (input) => {
        if (input.length > 0) {
          return [null, input]
        }

        return [input.length, null]
      },
    })

    // TODO continue from here, it should match the type definition
    expectTypeOf(value).toEqualTypeOf<
      ImpulseFormValue<string, number, string>
    >()
    expectTypeOf(value.getOutput(scope)).toEqualTypeOf<null | string>()
    expectTypeOf(value.getError(scope)).toEqualTypeOf<null | number>()
  })
})
