// TODO split all tests like ./ImpulseFormShape/isValidated.test.ts

import { equals } from "remeda"
import { z } from "zod"

import {
  type ImpulseForm,
  type Setter,
  ImpulseFormShape,
  ImpulseFormValue,
} from "../src"

const arg =
  <TIndex extends number>(index: TIndex) =>
  <TArgs extends ReadonlyArray<unknown>>(...args: TArgs): TArgs[TIndex] =>
    args[index]

describe("ImpulseFormShape.of()", () => {
  it("composes ImpulseFormShape from ImpulseFormValue", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      second: ImpulseFormValue.of(0),
      third: ImpulseFormValue.of([false]),
    })

    expectTypeOf(shape).toEqualTypeOf<
      ImpulseFormShape<{
        first: ImpulseFormValue<string>
        second: ImpulseFormValue<number>
        third: ImpulseFormValue<Array<boolean>>
      }>
    >()

    const originalValue = shape.getOriginalValue(scope)

    expectTypeOf(originalValue).toEqualTypeOf<{
      readonly first: string
      readonly second: number
      readonly third: Array<boolean>
    }>()
    expect(originalValue).toStrictEqual({
      first: "",
      second: 0,
      third: [false],
    })

    const value = shape.getValue(scope)

    expectTypeOf(value).toEqualTypeOf<null | {
      readonly first: string
      readonly second: number
      readonly third: Array<boolean>
    }>()
    expect(value).toStrictEqual({
      first: "",
      second: 0,
      third: [false],
    })
  })

  it("composes ImpulseFormShape from ImpulseFormValue with schema", ({
    scope,
  }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of("", {
        schema: z.string().min(1).pipe(z.coerce.boolean()),
      }),
      second: ImpulseFormValue.of(0, {
        schema: z
          .number()
          .min(100)
          .transform((x) => x.toFixed(2)),
      }),
    })

    expectTypeOf(shape).toEqualTypeOf<
      ImpulseFormShape<{
        first: ImpulseFormValue<string, boolean>
        second: ImpulseFormValue<number, string>
      }>
    >()

    const value = shape.getValue(scope)

    expectTypeOf(value).toEqualTypeOf<null | {
      readonly first: boolean
      readonly second: string
    }>()
    expect(value).toBeNull()
  })

  it("gives direct access to the fields", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      second: ImpulseFormValue.of(0),
    })

    expect(shape.fields.first.getOriginalValue(scope)).toBe("")
    expect(shape.fields.second.getOriginalValue(scope)).toBe(0)
  })

  it("allows to specify none-form fields", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      id: 123,
      name: "john",
    })

    expectTypeOf(shape).toEqualTypeOf<
      ImpulseFormShape<{
        first: ImpulseFormValue<string>
        id: number
        name: string
      }>
    >()

    const originalValue = shape.getOriginalValue(scope)
    expectTypeOf(originalValue).toEqualTypeOf<{
      readonly first: string
      readonly id: number
      readonly name: string
    }>()
    expect(originalValue).toStrictEqual({
      first: "",
      id: 123,
      name: "john",
    })

    const value = shape.getValue(scope)
    expectTypeOf(value).toEqualTypeOf<null | {
      readonly first: string
      readonly id: number
      readonly name: string
    }>()
    expect(value).toStrictEqual({
      first: "",
      id: 123,
      name: "john",
    })
  })

  describe("ImpulseFormShapeOptions.touched", () => {
    it("specifies initial touched", ({ scope }) => {
      const shape = ImpulseFormShape.of(
        {
          first: ImpulseFormValue.of(""),
          second: ImpulseFormValue.of(0),
          third: ImpulseFormShape.of({
            one: ImpulseFormValue.of(true),
            two: ImpulseFormValue.of([""]),
          }),
          fourth: ["anything"],
        },
        {
          touched: {
            first: true,
            third: true,
          },
        },
      )

      expect(shape.isTouched(scope, arg(1))).toStrictEqual({
        first: true,
        second: false,
        third: {
          one: true,
          two: true,
        },
      })
    })

    it("gets current touched from setters", ({ scope }) => {
      const shape = ImpulseFormShape.of(
        {
          first: ImpulseFormValue.of("", { touched: true }),
          second: ImpulseFormValue.of(0),
          third: ImpulseFormShape.of(
            {
              one: ImpulseFormValue.of(true),
              two: ImpulseFormValue.of([""]),
            },
            {
              touched: true,
            },
          ),
          fourth: ["anything"],
        },
        {
          touched: (root) => {
            expectTypeOf(root).toEqualTypeOf<{
              readonly first: boolean
              readonly second: boolean
              readonly third: {
                readonly one: boolean
                readonly two: boolean
              }
            }>()

            expect(root).toStrictEqual({
              first: true,
              second: false,
              third: {
                one: true,
                two: true,
              },
            })

            return {
              first: (first) => {
                expectTypeOf(first).toEqualTypeOf<boolean>()
                expect(first).toBe(true)

                return !first
              },
              second: (second) => {
                expectTypeOf(second).toEqualTypeOf<boolean>()
                expect(second).toBe(false)

                return !second
              },
              third: (third) => {
                expectTypeOf(third).toEqualTypeOf<{
                  readonly one: boolean
                  readonly two: boolean
                }>()
                expect(third).toStrictEqual({
                  one: true,
                  two: true,
                })

                return {
                  one: (one) => {
                    expectTypeOf(one).toEqualTypeOf<boolean>()
                    expect(one).toBe(true)

                    return !one
                  },
                  two: (two) => {
                    expectTypeOf(two).toEqualTypeOf<boolean>()
                    expect(two).toBe(true)

                    return !two
                  },
                }
              },
            }
          },
        },
      )

      expect(shape.isTouched(scope, arg(1))).toStrictEqual({
        first: false,
        second: true,
        third: {
          one: false,
          two: false,
        },
      })
    })
  })

  describe("ImpulseFormShapeOptions.errors", () => {
    it("specifies initial errors", ({ scope }) => {
      const shape = ImpulseFormShape.of(
        {
          first: ImpulseFormValue.of(""),
          second: ImpulseFormValue.of(0),
          third: ImpulseFormShape.of({
            one: ImpulseFormValue.of(true, { errors: ["some"] }),
            two: ImpulseFormValue.of([""]),
          }),
          fourth: ["anything"],
        },
        {
          errors: {
            first: ["another"],
            third: null,
          },
        },
      )

      expect(shape.getErrors(scope, arg(1))).toStrictEqual({
        first: ["another"],
        second: null,
        third: {
          one: null,
          two: null,
        },
      })
    })

    it("gets current errors from setters", ({ scope }) => {
      const shape = ImpulseFormShape.of(
        {
          first: ImpulseFormValue.of("", { errors: ["first"] }),
          second: ImpulseFormValue.of(0, { errors: ["second"] }),
          third: ImpulseFormShape.of(
            {
              one: ImpulseFormValue.of(true),
              two: ImpulseFormValue.of([""]),
            },
            {
              errors: {
                one: ["one"],
                two: ["two"],
              },
            },
          ),
          fourth: ["anything"],
        },
        {
          errors: (root) => {
            expectTypeOf(root).toEqualTypeOf<{
              readonly first: null | ReadonlyArray<string>
              readonly second: null | ReadonlyArray<string>
              readonly third: {
                readonly one: null | ReadonlyArray<string>
                readonly two: null | ReadonlyArray<string>
              }
            }>()

            expect(root).toStrictEqual({
              first: ["first"],
              second: ["second"],
              third: {
                one: ["one"],
                two: ["two"],
              },
            })

            return {
              first: (first) => {
                expectTypeOf(
                  first,
                ).toEqualTypeOf<null | ReadonlyArray<string>>()
                expect(first).toStrictEqual(["first"])

                return [...first!, "1"]
              },
              second: (second) => {
                expectTypeOf(
                  second,
                ).toEqualTypeOf<null | ReadonlyArray<string>>()
                expect(second).toStrictEqual(["second"])

                return [...second!, "2"]
              },
              third: (third) => {
                expectTypeOf(third).toEqualTypeOf<{
                  readonly one: null | ReadonlyArray<string>
                  readonly two: null | ReadonlyArray<string>
                }>()
                expect(third).toStrictEqual({
                  one: ["one"],
                  two: ["two"],
                })

                return {
                  one: (one) => {
                    expectTypeOf(
                      one,
                    ).toEqualTypeOf<null | ReadonlyArray<string>>()
                    expect(one).toStrictEqual(["one"])

                    return [...one!, "1"]
                  },
                  two: (two) => {
                    expectTypeOf(
                      two,
                    ).toEqualTypeOf<null | ReadonlyArray<string>>()
                    expect(two).toStrictEqual(["two"])

                    return [...two!, "2"]
                  },
                }
              },
            }
          },
        },
      )

      expect(shape.getErrors(scope, arg(1))).toStrictEqual({
        first: ["first", "1"],
        second: ["second", "2"],
        third: {
          one: ["one", "1"],
          two: ["two", "2"],
        },
      })
    })
  })

  describe("ImpulseFormShapeOptions.initialValue", () => {
    it("specifies initial value", ({ scope }) => {
      const shape = ImpulseFormShape.of(
        {
          first: ImpulseFormValue.of(""),
          second: ImpulseFormValue.of(0),
          third: ImpulseFormShape.of({
            one: ImpulseFormValue.of(true),
            two: ImpulseFormValue.of([""]),
          }),
          fourth: ["anything"],
        },
        {
          initialValue: {
            first: "1",
            third: {
              one: false,
            },
          },
        },
      )

      expect(shape.getInitialValue(scope)).toStrictEqual({
        first: "1",
        second: 0,
        third: {
          one: false,
          two: [""],
        },
        fourth: ["anything"],
      })
      expect(shape.getOriginalValue(scope)).toStrictEqual({
        first: "",
        second: 0,
        third: {
          one: true,
          two: [""],
        },
        fourth: ["anything"],
      })
    })

    it("gets current initial value from setters", ({ scope }) => {
      const shape = ImpulseFormShape.of(
        {
          first: ImpulseFormValue.of("", { initialValue: "1" }),
          second: ImpulseFormValue.of(0),
          third: ImpulseFormShape.of({
            one: ImpulseFormValue.of(true, { initialValue: false }),
            two: ImpulseFormValue.of([""], { initialValue: ["two"] }),
          }),
          fourth: ["anything"],
        },
        {
          initialValue: (root) => {
            expectTypeOf(root).toEqualTypeOf<{
              readonly first: string
              readonly second: number
              readonly third: {
                readonly one: boolean
                readonly two: Array<string>
              }
              readonly fourth: Array<string>
            }>()
            expect(root).toStrictEqual({
              first: "1",
              second: 0,
              third: {
                one: false,
                two: ["two"],
              },
              fourth: ["anything"],
            })

            return {
              first: (first) => {
                expectTypeOf(first).toEqualTypeOf<string>()
                expect(first).toBe("1")

                return first + "-first"
              },
              second: (second) => {
                expectTypeOf(second).toEqualTypeOf<number>()
                expect(second).toBe(0)

                return second + 2
              },
              third: (third) => {
                expectTypeOf(third).toEqualTypeOf<{
                  readonly one: boolean
                  readonly two: Array<string>
                }>()
                expect(third).toStrictEqual({
                  one: false,
                  two: ["two"],
                })

                return {
                  one: (one) => {
                    expectTypeOf(one).toEqualTypeOf<boolean>()
                    expect(one).toBe(false)

                    return !one
                  },
                  two: (two) => {
                    expectTypeOf(two).toEqualTypeOf<Array<string>>()
                    expect(two).toStrictEqual(["two"])

                    return [...two, "three"]
                  },
                }
              },
            }
          },
        },
      )

      expect(shape.getInitialValue(scope)).toStrictEqual({
        first: "1-first",
        second: 2,
        third: {
          one: true,
          two: ["two", "three"],
        },
        fourth: ["anything"],
      })
    })
  })

  describe("ImpulseFormShapeOptions.originalValue", () => {
    it("specifies initial value", ({ scope }) => {
      const shape = ImpulseFormShape.of(
        {
          first: ImpulseFormValue.of(""),
          second: ImpulseFormValue.of(0),
          third: ImpulseFormShape.of({
            one: ImpulseFormValue.of(true),
            two: ImpulseFormValue.of([""]),
          }),
          fourth: ["anything"],
        },
        {
          originalValue: {
            first: "1",
            third: {
              one: false,
            },
          },
        },
      )

      expect(shape.getInitialValue(scope)).toStrictEqual({
        first: "",
        second: 0,
        third: {
          one: true,
          two: [""],
        },
        fourth: ["anything"],
      })
      expect(shape.getOriginalValue(scope)).toStrictEqual({
        first: "1",
        second: 0,
        third: {
          one: false,
          two: [""],
        },
        fourth: ["anything"],
      })
    })

    it("gets current initial value from setters", ({ scope }) => {
      const shape = ImpulseFormShape.of(
        {
          first: ImpulseFormValue.of("1"),
          second: ImpulseFormValue.of(0),
          third: ImpulseFormShape.of({
            one: ImpulseFormValue.of(false),
            two: ImpulseFormValue.of(["two"]),
          }),
          fourth: ["anything"],
        },
        {
          originalValue: (root) => {
            expectTypeOf(root).toEqualTypeOf<{
              readonly first: string
              readonly second: number
              readonly third: {
                readonly one: boolean
                readonly two: Array<string>
              }
              readonly fourth: Array<string>
            }>()
            expect(root).toStrictEqual({
              first: "1",
              second: 0,
              third: {
                one: false,
                two: ["two"],
              },
              fourth: ["anything"],
            })

            return {
              first: (first) => {
                expectTypeOf(first).toEqualTypeOf<string>()
                expect(first).toBe("1")

                return first + "-first"
              },
              second: (second) => {
                expectTypeOf(second).toEqualTypeOf<number>()
                expect(second).toBe(0)

                return second + 2
              },
              third: (third) => {
                expectTypeOf(third).toEqualTypeOf<{
                  readonly one: boolean
                  readonly two: Array<string>
                }>()
                expect(third).toStrictEqual({
                  one: false,
                  two: ["two"],
                })

                return {
                  one: (one) => {
                    expectTypeOf(one).toEqualTypeOf<boolean>()
                    expect(one).toBe(false)

                    return !one
                  },
                  two: (two) => {
                    expectTypeOf(two).toEqualTypeOf<Array<string>>()
                    expect(two).toStrictEqual(["two"])

                    return [...two, "three"]
                  },
                }
              },
            }
          },
        },
      )

      expect(shape.getOriginalValue(scope)).toStrictEqual({
        first: "1-first",
        second: 2,
        third: {
          one: true,
          two: ["two", "three"],
        },
        fourth: ["anything"],
      })
    })
  })

  it("follows the options type", () => {
    expectTypeOf(
      ImpulseFormShape.of<{
        first: ImpulseFormValue<string>
        second: ImpulseFormValue<number>
        third: ImpulseFormShape<{
          one: ImpulseFormValue<boolean>
          two: ImpulseFormValue<Array<string>>
        }>
        fourth: Array<string>
      }>,
    )
      .parameter(1)
      .toMatchTypeOf<
        | undefined
        | {
            touched?: Setter<
              | boolean
              | {
                  readonly first?: Setter<boolean>
                  readonly second?: Setter<boolean>
                  readonly third?: Setter<
                    | boolean
                    | {
                        readonly one?: Setter<boolean>
                        readonly two?: Setter<boolean>
                      },
                    [
                      {
                        readonly one: boolean
                        readonly two: boolean
                      },
                    ]
                  >
                },
              [
                {
                  readonly first: boolean
                  readonly second: boolean
                  readonly third: {
                    readonly one: boolean
                    readonly two: boolean
                  }
                },
              ]
            >

            initialValue?: Setter<
              {
                readonly first?: Setter<string>
                readonly second?: Setter<number>
                readonly third?: Setter<
                  {
                    readonly one?: Setter<boolean>
                    readonly two?: Setter<Array<string>>
                  },
                  [
                    {
                      readonly one: boolean
                      readonly two: Array<string>
                    },
                  ]
                >
              },
              [
                {
                  readonly first: string
                  readonly second: number
                  readonly third: {
                    readonly one: boolean
                    readonly two: Array<string>
                  }
                  readonly fourth: Array<string>
                },
              ]
            >

            originalValue?: Setter<
              {
                readonly first?: Setter<string>
                readonly second?: Setter<number>
                readonly third?: Setter<
                  {
                    readonly one?: Setter<boolean>
                    readonly two?: Setter<Array<string>>
                  },
                  [
                    {
                      readonly one: boolean
                      readonly two: Array<string>
                    },
                  ]
                >
              },
              [
                {
                  readonly first: string
                  readonly second: number
                  readonly third: {
                    readonly one: boolean
                    readonly two: Array<string>
                  }
                  readonly fourth: Array<string>
                },
              ]
            >
          }
      >()
  })
})

describe("ImpulseFormShape#getErrors()", () => {
  it("selects errors", ({ scope }) => {
    const shape = ImpulseFormShape.of(
      {
        first: ImpulseFormValue.of("1", { schema: z.string().max(1) }),
        second: ImpulseFormValue.of(0, { schema: z.number().nonnegative() }),
        third: ImpulseFormShape.of({
          one: ImpulseFormValue.of(true),
          two: ImpulseFormValue.of(["1"], {
            schema: z.array(z.string().max(1)),
          }),
        }),
        fourth: ["anything"],
      },
      { touched: true },
    )

    expect(shape.getErrors(scope)).toBeNull()
    expect(shape.getErrors(scope, arg(0))).toBeNull()
    expect(shape.getErrors(scope, arg(1))).toStrictEqual({
      first: null,
      second: null,
      third: {
        one: null,
        two: null,
      },
    })

    shape.setOriginalValue({
      first: "12",
    })
    expect(shape.getErrors(scope)).toStrictEqual({
      first: ["String must contain at most 1 character(s)"],
      second: null,
      third: null,
    })
    expect(shape.getErrors(scope, arg(0))).toStrictEqual(shape.getErrors(scope))
    expect(shape.getErrors(scope, arg(1))).toStrictEqual({
      first: ["String must contain at most 1 character(s)"],
      second: null,
      third: {
        one: null,
        two: null,
      },
    })

    shape.setOriginalValue({
      third: {
        two: ["1", "12"],
      },
    })
    expect(shape.getErrors(scope)).toStrictEqual({
      first: ["String must contain at most 1 character(s)"],
      second: null,
      third: {
        one: null,
        two: ["String must contain at most 1 character(s)"],
      },
    })
    expect(shape.getErrors(scope, arg(0))).toStrictEqual(shape.getErrors(scope))
    expect(shape.getErrors(scope, arg(1))).toStrictEqual(shape.getErrors(scope))

    expectTypeOf(shape.getErrors(scope)).toEqualTypeOf<null | {
      readonly first: null | ReadonlyArray<string>
      readonly second: null | ReadonlyArray<string>
      readonly third: null | {
        readonly one: null | ReadonlyArray<string>
        readonly two: null | ReadonlyArray<string>
      }
    }>()

    expectTypeOf(shape.fields.third.getErrors(scope)).toEqualTypeOf<null | {
      readonly one: null | ReadonlyArray<string>
      readonly two: null | ReadonlyArray<string>
    }>()
  })
})

describe("ImpulseFormShape#setErrors()", () => {
  it("specifies errors", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of("", { errors: ["first"] }),
      second: ImpulseFormValue.of(0, { errors: ["second"] }),
      third: ImpulseFormShape.of(
        {
          one: ImpulseFormValue.of(true),
          two: ImpulseFormValue.of([""]),
        },
        {
          errors: {
            one: ["one"],
            two: ["two"],
          },
        },
      ),
      fourth: ["anything"],
    })

    expect(shape.getErrors(scope)).toStrictEqual({
      first: ["first"],
      second: ["second"],
      third: {
        one: ["one"],
        two: ["two"],
      },
    })

    shape.setErrors({
      first: ["another"],
      second: undefined,
      third: null,
    })
    expect(shape.getErrors(scope)).toStrictEqual({
      first: ["another"],
      second: ["second"],
      third: null,
    })
    expect(shape.getErrors(scope, arg(1))).toStrictEqual({
      first: ["another"],
      second: ["second"],
      third: {
        one: null,
        two: null,
      },
    })

    shape.setErrors({
      third: {
        one: ["one"],
        two: ["two"],
      },
    })
    shape.setErrors((root) => {
      expectTypeOf(root).toEqualTypeOf<{
        readonly first: null | ReadonlyArray<string>
        readonly second: null | ReadonlyArray<string>
        readonly third: {
          readonly one: null | ReadonlyArray<string>
          readonly two: null | ReadonlyArray<string>
        }
      }>()
      expect(root).toStrictEqual({
        first: ["another"],
        second: ["second"],
        third: {
          one: ["one"],
          two: ["two"],
        },
      })

      return {
        first: (first) => {
          expectTypeOf(first).toEqualTypeOf<null | ReadonlyArray<string>>()
          expect(first).toStrictEqual(["another"])

          return [...first!, "1"]
        },
        second: (second) => {
          expectTypeOf(second).toEqualTypeOf<null | ReadonlyArray<string>>()
          expect(second).toStrictEqual(["second"])

          return [...second!, "2"]
        },
        third: (third) => {
          expectTypeOf(third).toEqualTypeOf<{
            readonly one: null | ReadonlyArray<string>
            readonly two: null | ReadonlyArray<string>
          }>()
          expect(third).toStrictEqual({
            one: ["one"],
            two: ["two"],
          })

          return {
            one: (one) => {
              expectTypeOf(one).toEqualTypeOf<null | ReadonlyArray<string>>()
              expect(one).toStrictEqual(["one"])

              return [...one!, "1"]
            },

            two: (two) => {
              expectTypeOf(two).toEqualTypeOf<null | ReadonlyArray<string>>()
              expect(two).toStrictEqual(["two"])

              return [...two!, "2"]
            },
          }
        },
      }
    })

    expect(shape.getErrors(scope)).toStrictEqual({
      first: ["another", "1"],
      second: ["second", "2"],
      third: {
        one: ["one", "1"],
        two: ["two", "2"],
      },
    })

    expectTypeOf(shape.setErrors).parameter(0).toEqualTypeOf<
      Setter<
        null | {
          readonly first?: Setter<null | ReadonlyArray<string>>
          readonly second?: Setter<null | ReadonlyArray<string>>
          readonly third?: Setter<
            null | {
              readonly one?: Setter<null | ReadonlyArray<string>>
              readonly two?: Setter<null | ReadonlyArray<string>>
            },
            [
              {
                readonly one: null | ReadonlyArray<string>
                readonly two: null | ReadonlyArray<string>
              },
            ]
          >
        },
        [
          {
            readonly first: null | ReadonlyArray<string>
            readonly second: null | ReadonlyArray<string>
            readonly third: {
              readonly one: null | ReadonlyArray<string>
              readonly two: null | ReadonlyArray<string>
            }
          },
        ]
      >
    >()

    expectTypeOf(shape.fields.third.setErrors).parameter(0).toEqualTypeOf<
      Setter<
        null | {
          readonly one?: Setter<null | ReadonlyArray<string>>
          readonly two?: Setter<null | ReadonlyArray<string>>
        },
        [
          {
            readonly one: null | ReadonlyArray<string>
            readonly two: null | ReadonlyArray<string>
          },
        ]
      >
    >()
  })

  it("resets all errors", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of("", { errors: ["first"] }),
      second: ImpulseFormValue.of(0, { errors: ["second"] }),
      third: ImpulseFormShape.of(
        {
          one: ImpulseFormValue.of(true),
          two: ImpulseFormValue.of([""]),
        },
        {
          errors: {
            one: ["one"],
            two: ["two"],
          },
        },
      ),
      fourth: ["anything"],
    })

    shape.setErrors(null)
    expect(shape.getErrors(scope)).toBeNull()
  })
})

describe("ImpulseFormShape#getValue()", () => {
  it("selects value", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      second: ImpulseFormValue.of(0, { schema: z.number().nonnegative() }),
      third: ImpulseFormShape.of({
        one: ImpulseFormValue.of(true),
        two: ImpulseFormValue.of(["1"], { schema: z.array(z.string().max(1)) }),
      }),
      fourth: ["anything"],
    })

    const value = shape.getValue(scope)
    expect(value).toStrictEqual({
      first: "",
      second: 0,
      third: {
        one: true,
        two: ["1"],
      },
      fourth: ["anything"],
    })
    expect(shape.getValue(scope, arg(0))).toStrictEqual(value)
    expect(shape.getValue(scope, arg(1))).toStrictEqual(value)

    shape.setOriginalValue({
      second: -1,
      third: {
        two: ["1", "12"],
      },
    })
    expect(shape.getValue(scope)).toBeNull()
    expect(shape.getValue(scope, arg(0))).toBeNull()
    expect(shape.getValue(scope, arg(1))).toStrictEqual({
      first: "",
      second: null,
      third: {
        one: true,
        two: null,
      },
      fourth: ["anything"],
    })

    expectTypeOf(shape.getValue(scope)).toEqualTypeOf<null | {
      readonly first: string
      readonly second: number
      readonly third: {
        readonly one: boolean
        readonly two: Array<string>
      }
      readonly fourth: Array<string>
    }>()
    expectTypeOf(shape.getValue(scope, arg(0))).toEqualTypeOf<null | {
      readonly first: string
      readonly second: number
      readonly third: {
        readonly one: boolean
        readonly two: Array<string>
      }
      readonly fourth: Array<string>
    }>()
    expectTypeOf(shape.getValue(scope, arg(1))).toEqualTypeOf<{
      readonly first: null | string
      readonly second: null | number
      readonly third: {
        readonly one: null | boolean
        readonly two: null | Array<string>
      }
      readonly fourth: Array<string>
    }>()
  })
})

describe("ImpulseFormShape#isTouched()", () => {
  it("selects touched", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      second: ImpulseFormValue.of(0),
      third: ImpulseFormShape.of({
        one: ImpulseFormValue.of(true),
        two: ImpulseFormValue.of([""]),
      }),
      fourth: ["anything"],
    })

    expect(shape.isTouched(scope)).toBe(false)
    expect(shape.isTouched(scope, arg(0))).toBe(false)
    expect(shape.isTouched(scope, arg(1))).toStrictEqual({
      first: false,
      second: false,
      third: {
        one: false,
        two: false,
      },
    })
    expect(shape.fields.third.isTouched(scope)).toBe(false)
    expect(shape.fields.third.isTouched(scope, arg(0))).toBe(false)
    expect(shape.fields.third.isTouched(scope, arg(1))).toStrictEqual({
      one: false,
      two: false,
    })

    shape.fields.third.fields.one.setTouched(true)
    expect(shape.fields.third.isTouched(scope)).toBe(true)
    expect(shape.fields.third.isTouched(scope, arg(0))).toStrictEqual({
      one: true,
      two: false,
    })
    expect(shape.fields.third.isTouched(scope, arg(1))).toStrictEqual({
      one: true,
      two: false,
    })
    expect(shape.fields.third.fields.one.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope, arg(0))).toStrictEqual({
      first: false,
      second: false,
      third: {
        one: true,
        two: false,
      },
    })
    expect(shape.isTouched(scope, arg(1))).toStrictEqual({
      first: false,
      second: false,
      third: {
        one: true,
        two: false,
      },
    })

    shape.fields.first.setTouched(true)
    expect(shape.fields.first.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope, arg(0))).toStrictEqual({
      first: true,
      second: false,
      third: {
        one: true,
        two: false,
      },
    })

    shape.fields.second.setTouched(true)
    expect(shape.fields.second.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope, arg(0))).toStrictEqual({
      first: true,
      second: true,
      third: {
        one: true,
        two: false,
      },
    })

    shape.fields.third.fields.two.setTouched(true)
    expect(shape.fields.third.fields.two.isTouched(scope)).toBe(true)
    expect(shape.fields.third.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope, arg(0))).toBe(true)
    expect(shape.isTouched(scope, arg(1))).toStrictEqual({
      first: true,
      second: true,
      third: {
        one: true,
        two: true,
      },
    })

    expectTypeOf(
      shape.fields.third.fields.one.isTouched(scope, arg(0)),
    ).toEqualTypeOf<boolean>()
    expectTypeOf(
      shape.fields.third.fields.one.isTouched(scope, arg(1)),
    ).toEqualTypeOf<boolean>()

    expectTypeOf(shape.fields.third.isTouched(scope, arg(0))).toEqualTypeOf<
      | boolean
      | {
          readonly one: boolean
          readonly two: boolean
        }
    >()
    expectTypeOf(shape.fields.third.isTouched(scope, arg(1))).toEqualTypeOf<{
      readonly one: boolean
      readonly two: boolean
    }>()

    expectTypeOf(shape.isTouched(scope, arg(0))).toEqualTypeOf<
      | boolean
      | {
          readonly first: boolean
          readonly second: boolean
          readonly third:
            | boolean
            | {
                readonly one: boolean
                readonly two: boolean
              }
        }
    >()
    expectTypeOf(shape.isTouched(scope, arg(1))).toEqualTypeOf<{
      readonly first: boolean
      readonly second: boolean
      readonly third: {
        readonly one: boolean
        readonly two: boolean
      }
    }>()
  })

  it("does not allow to specify isTouched custom type without selector", ({
    scope,
  }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      second: ImpulseFormValue.of(0),
    })

    // @ts-expect-error it should select string to return string
    const isTouched = shape.isTouched<string>(scope)
    expect(isTouched).toBe(false)
    expectTypeOf(isTouched).toEqualTypeOf<boolean>()
  })
})

describe("ImpulseFormShape#setTouched()", () => {
  it("specifies touched", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      second: ImpulseFormValue.of(0),
      third: ImpulseFormShape.of({
        one: ImpulseFormValue.of(true),
        two: ImpulseFormValue.of([""]),
      }),
      fourth: ["anything"],
    })

    shape.setTouched(true)
    expect(shape.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope, arg(0))).toBe(true)
    expect(shape.isTouched(scope, arg(1))).toStrictEqual({
      first: true,
      second: true,
      third: {
        one: true,
        two: true,
      },
    })

    shape.fields.third.setTouched(false)
    expect(shape.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope, arg(0))).toStrictEqual({
      first: true,
      second: true,
      third: false,
    })
    expect(shape.isTouched(scope, arg(1))).toStrictEqual({
      first: true,
      second: true,
      third: {
        one: false,
        two: false,
      },
    })

    shape.setTouched({
      third: {
        one: true,
        two: undefined,
      },
    })
    expect(shape.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope, arg(0))).toStrictEqual({
      first: true,
      second: true,
      third: {
        one: true,
        two: false,
      },
    })
    expect(shape.isTouched(scope, arg(1))).toStrictEqual({
      first: true,
      second: true,
      third: {
        one: true,
        two: false,
      },
    })

    shape.setTouched((root) => {
      expect(root).toStrictEqual({
        first: true,
        second: true,
        third: {
          one: true,
          two: false,
        },
      })

      return {
        third: (third) => {
          expect(third).toStrictEqual({
            one: true,
            two: false,
          })

          return {
            two: (two) => {
              expect(two).toBe(false)

              return true
            },
          }
        },
      }
    })
    expect(shape.isTouched(scope)).toBe(true)
    expect(shape.isTouched(scope, arg(0))).toBe(true)
    expect(shape.isTouched(scope, arg(1))).toStrictEqual({
      first: true,
      second: true,
      third: {
        one: true,
        two: true,
      },
    })

    expectTypeOf(shape.fields.third.fields.one.setTouched)
      .parameter(0)
      .toEqualTypeOf<Setter<boolean>>()

    expectTypeOf(shape.fields.third.setTouched).parameter(0).toEqualTypeOf<
      Setter<
        | boolean
        | {
            readonly one?: Setter<boolean>
            readonly two?: Setter<boolean>
          },
        [
          {
            readonly one: boolean
            readonly two: boolean
          },
        ]
      >
    >()

    expectTypeOf(shape.setTouched).parameter(0).toEqualTypeOf<
      Setter<
        | boolean
        | {
            readonly first?: Setter<boolean>
            readonly second?: Setter<boolean>
            readonly third?: Setter<
              | boolean
              | {
                  readonly one?: Setter<boolean>
                  readonly two?: Setter<boolean>
                },
              [
                {
                  readonly one: boolean
                  readonly two: boolean
                },
              ]
            >
          },
        [
          {
            readonly first: boolean
            readonly second: boolean
            readonly third: {
              readonly one: boolean
              readonly two: boolean
            }
          },
        ]
      >
    >()
  })
})

describe("ImpulseFormShape#setOriginalValue()", () => {
  it("updates original value", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      second: ImpulseFormValue.of(0),
      third: ImpulseFormShape.of({
        one: ImpulseFormValue.of(true),
        two: ImpulseFormValue.of([""]),
      }),
      fourth: ["anything"],
    })

    expect(shape.getOriginalValue(scope)).toStrictEqual({
      first: "",
      second: 0,
      third: {
        one: true,
        two: [""],
      },
      fourth: ["anything"],
    })

    shape.setOriginalValue({
      third: {
        one: false,
        two: undefined,
      },
    })
    expect(shape.getOriginalValue(scope)).toStrictEqual({
      first: "",
      second: 0,
      third: {
        one: false,
        two: [""],
      },
      fourth: ["anything"],
    })

    shape.setOriginalValue({
      third: {
        two: (two) => [...two, "hi"],
      },
    })
    expect(shape.getOriginalValue(scope)).toStrictEqual({
      first: "",
      second: 0,
      third: {
        one: false,
        two: ["", "hi"],
      },
      fourth: ["anything"],
    })

    shape.setOriginalValue({
      first: "1",
      second: 2,
      third: {
        one: true,
        two: ["two"],
      },
    })
    expect(shape.getOriginalValue(scope)).toStrictEqual({
      first: "1",
      second: 2,
      third: {
        one: true,
        two: ["two"],
      },
      fourth: ["anything"],
    })

    shape.setOriginalValue((root) => {
      expect(root).toStrictEqual({
        first: "1",
        second: 2,
        third: {
          one: true,
          two: ["two"],
        },
        fourth: ["anything"],
      })

      return {
        first: (first) => {
          expect(first).toBe("1")

          return "one"
        },
        second: (second) => {
          expect(second).toBe(2)

          return 3
        },
        third: (third) => {
          expect(third).toStrictEqual({
            one: true,
            two: ["two"],
          })

          return {
            one: (one) => {
              expect(one).toBe(true)

              return false
            },
            two: (two) => {
              expect(two).toStrictEqual(["two"])

              return [...two, "three"]
            },
          }
        },
      }
    })
    expect(shape.getOriginalValue(scope)).toStrictEqual({
      first: "one",
      second: 3,
      third: {
        one: false,
        two: ["two", "three"],
      },
      fourth: ["anything"],
    })

    expectTypeOf(shape.getOriginalValue(scope)).toEqualTypeOf<{
      readonly first: string
      readonly second: number
      readonly third: {
        readonly one: boolean
        readonly two: Array<string>
      }
      readonly fourth: Array<string>
    }>()

    expectTypeOf(shape.fields.third.getOriginalValue(scope)).toEqualTypeOf<{
      readonly one: boolean
      readonly two: Array<string>
    }>()

    expectTypeOf(shape.setOriginalValue).parameter(0).toEqualTypeOf<
      Setter<
        {
          readonly first?: Setter<string>
          readonly second?: Setter<number>
          readonly third?: Setter<
            {
              readonly one?: Setter<boolean>
              readonly two?: Setter<Array<string>>
            },
            [
              {
                readonly one: boolean
                readonly two: Array<string>
              },
            ]
          >
        },
        [
          {
            readonly first: string
            readonly second: number
            readonly third: {
              readonly one: boolean
              readonly two: Array<string>
            }
            readonly fourth: Array<string>
          },
        ]
      >
    >()

    expectTypeOf(shape.fields.third.setOriginalValue)
      .parameter(0)
      .toEqualTypeOf<
        Setter<
          {
            readonly one?: Setter<boolean>
            readonly two?: Setter<Array<string>>
          },
          [
            {
              readonly one: boolean
              readonly two: Array<string>
            },
          ]
        >
      >()
  })
})

describe("ImpulseFormShape#setInitialValue()", () => {
  it("updates initial value", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      second: ImpulseFormValue.of(0),
      third: ImpulseFormShape.of({
        one: ImpulseFormValue.of(true),
        two: ImpulseFormValue.of([""]),
      }),
      fourth: ["anything"],
    })

    expect(shape.getInitialValue(scope)).toStrictEqual({
      first: "",
      second: 0,
      third: {
        one: true,
        two: [""],
      },
      fourth: ["anything"],
    })

    shape.setInitialValue({
      third: {
        one: false,
        two: undefined,
      },
    })
    expect(shape.getInitialValue(scope)).toStrictEqual({
      first: "",
      second: 0,
      third: {
        one: false,
        two: [""],
      },
      fourth: ["anything"],
    })

    shape.setInitialValue({
      third: {
        two: (two) => [...two, "hi"],
      },
    })
    expect(shape.getInitialValue(scope)).toStrictEqual({
      first: "",
      second: 0,
      third: {
        one: false,
        two: ["", "hi"],
      },
      fourth: ["anything"],
    })

    shape.setInitialValue({
      first: "1",
      second: 2,
      third: {
        one: true,
        two: ["two"],
      },
    })
    expect(shape.getInitialValue(scope)).toStrictEqual({
      first: "1",
      second: 2,
      third: {
        one: true,
        two: ["two"],
      },
      fourth: ["anything"],
    })

    shape.setInitialValue((root) => {
      expect(root).toStrictEqual({
        first: "1",
        second: 2,
        third: {
          one: true,
          two: ["two"],
        },
        fourth: ["anything"],
      })

      return {
        first: (first) => {
          expect(first).toBe("1")

          return "one"
        },
        second: (second) => {
          expect(second).toBe(2)

          return 3
        },
        third: (third) => {
          expect(third).toStrictEqual({
            one: true,
            two: ["two"],
          })

          return {
            one: (one) => {
              expect(one).toBe(true)

              return false
            },
            two: (two) => {
              expect(two).toStrictEqual(["two"])

              return [...two, "three"]
            },
          }
        },
      }
    })

    expect(shape.getInitialValue(scope)).toStrictEqual({
      first: "one",
      second: 3,
      third: {
        one: false,
        two: ["two", "three"],
      },
      fourth: ["anything"],
    })

    expectTypeOf(shape.getInitialValue(scope)).toEqualTypeOf<{
      readonly first: string
      readonly second: number
      readonly third: {
        readonly one: boolean
        readonly two: Array<string>
      }
      readonly fourth: Array<string>
    }>()

    expectTypeOf(shape.fields.third.getInitialValue(scope)).toEqualTypeOf<{
      readonly one: boolean
      readonly two: Array<string>
    }>()

    expectTypeOf(shape.setInitialValue).parameter(0).toEqualTypeOf<
      Setter<
        {
          readonly first?: Setter<string>
          readonly second?: Setter<number>
          readonly third?: Setter<
            {
              readonly one?: Setter<boolean>
              readonly two?: Setter<Array<string>>
            },
            [
              {
                readonly one: boolean
                readonly two: Array<string>
              },
            ]
          >
        },
        [
          {
            readonly first: string
            readonly second: number
            readonly third: {
              readonly one: boolean
              readonly two: Array<string>
            }
            readonly fourth: Array<string>
          },
        ]
      >
    >()

    expectTypeOf(shape.fields.third.setInitialValue).parameter(0).toEqualTypeOf<
      Setter<
        {
          readonly one?: Setter<boolean>
          readonly two?: Setter<Array<string>>
        },
        [
          {
            readonly one: boolean
            readonly two: Array<string>
          },
        ]
      >
    >()
  })
})

describe("ImpulseFormShape#isDirty()", () => {
  it("selects touched", ({ scope }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      second: ImpulseFormValue.of(0),
      third: ImpulseFormShape.of({
        one: ImpulseFormValue.of(true),
        two: ImpulseFormValue.of([""], {
          compare: (left, right) => equals(left, right),
        }),
      }),
      fourth: ["anything"],
    })

    expect(shape.isDirty(scope)).toBe(false)
    expect(shape.isDirty(scope, arg(0))).toBe(false)
    expect(shape.isDirty(scope, arg(1))).toStrictEqual({
      first: false,
      second: false,
      third: {
        one: false,
        two: false,
      },
    })
    expect(shape.fields.third.isDirty(scope)).toBe(false)
    expect(shape.fields.third.isDirty(scope, arg(0))).toBe(false)
    expect(shape.fields.third.isDirty(scope, arg(1))).toStrictEqual({
      one: false,
      two: false,
    })

    shape.fields.third.fields.one.setOriginalValue(false)
    expect(shape.fields.third.isDirty(scope)).toBe(true)
    expect(shape.fields.third.isDirty(scope, arg(0))).toStrictEqual({
      one: true,
      two: false,
    })
    expect(shape.fields.third.isDirty(scope, arg(1))).toStrictEqual({
      one: true,
      two: false,
    })
    expect(shape.fields.third.fields.one.isDirty(scope)).toBe(true)
    expect(shape.isDirty(scope)).toBe(true)
    expect(shape.isDirty(scope, arg(0))).toStrictEqual({
      first: false,
      second: false,
      third: {
        one: true,
        two: false,
      },
    })
    expect(shape.isDirty(scope, arg(1))).toStrictEqual({
      first: false,
      second: false,
      third: {
        one: true,
        two: false,
      },
    })

    shape.fields.first.setOriginalValue("1")
    expect(shape.fields.first.isDirty(scope)).toBe(true)
    expect(shape.isDirty(scope)).toBe(true)
    expect(shape.isDirty(scope, arg(0))).toStrictEqual({
      first: true,
      second: false,
      third: {
        one: true,
        two: false,
      },
    })

    shape.fields.second.setOriginalValue(2)
    expect(shape.fields.second.isDirty(scope)).toBe(true)
    expect(shape.isDirty(scope)).toBe(true)
    expect(shape.isDirty(scope, arg(0))).toStrictEqual({
      first: true,
      second: true,
      third: {
        one: true,
        two: false,
      },
    })

    shape.fields.third.fields.two.setOriginalValue(["one", "two"])
    expect(shape.fields.third.fields.two.isDirty(scope)).toBe(true)
    expect(shape.fields.third.isDirty(scope)).toBe(true)
    expect(shape.isDirty(scope)).toBe(true)
    expect(shape.isDirty(scope, arg(0))).toBe(true)
    expect(shape.isDirty(scope, arg(1))).toStrictEqual({
      first: true,
      second: true,
      third: {
        one: true,
        two: true,
      },
    })

    expectTypeOf(
      shape.fields.third.fields.one.isDirty(scope, arg(0)),
    ).toEqualTypeOf<boolean>()
    expectTypeOf(
      shape.fields.third.fields.one.isDirty(scope, arg(1)),
    ).toEqualTypeOf<boolean>()

    expectTypeOf(shape.fields.third.isDirty(scope, arg(0))).toEqualTypeOf<
      | boolean
      | {
          readonly one: boolean
          readonly two: boolean
        }
    >()
    expectTypeOf(shape.fields.third.isDirty(scope, arg(1))).toEqualTypeOf<{
      readonly one: boolean
      readonly two: boolean
    }>()

    expectTypeOf(shape.isDirty(scope, arg(0))).toEqualTypeOf<
      | boolean
      | {
          readonly first: boolean
          readonly second: boolean
          readonly third:
            | boolean
            | {
                readonly one: boolean
                readonly two: boolean
              }
        }
    >()
    expectTypeOf(shape.isDirty(scope, arg(1))).toEqualTypeOf<{
      readonly first: boolean
      readonly second: boolean
      readonly third: {
        readonly one: boolean
        readonly two: boolean
      }
    }>()
  })

  it("does not allow to specify isDirty custom type without selector", ({
    scope,
  }) => {
    const shape = ImpulseFormShape.of({
      first: ImpulseFormValue.of(""),
      second: ImpulseFormValue.of(0),
    })

    // @ts-expect-error it should select string to return string
    const isDirty = shape.isDirty<string>(scope)
    expect(isDirty).toBe(false)
    expectTypeOf(isDirty).toEqualTypeOf<boolean>()
  })
})

describe("ImpulseFormShape#reset()", () => {
  const setup = () => {
    return ImpulseFormShape.of(
      {
        first: ImpulseFormValue.of(""),
        second: ImpulseFormValue.of(0),
        third: ImpulseFormShape.of({
          one: ImpulseFormValue.of(true),
          two: ImpulseFormValue.of([""], {
            compare: (left, right) => equals(left, right),
          }),
        }),
        fourth: ["anything"],
      },
      {
        initialValue: {
          first: "1",
          second: 2,
          third: {
            one: false,
            two: ["two"],
          },
        },
      },
    )
  }

  describe.each([
    ["without arguments", (form: ImpulseForm) => form.reset()],
    ["with resetter=arg(0)", (form: ImpulseForm) => form.reset(arg(0))],
  ])("%s", (_, reset) => {
    it("resets the shape", ({ scope }) => {
      const shape = setup()

      reset(shape)
      const originalValue = shape.getOriginalValue(scope)
      expect(originalValue).toStrictEqual({
        first: "1",
        second: 2,
        third: {
          one: false,
          two: ["two"],
        },
        fourth: ["anything"],
      })
      expect(shape.getInitialValue(scope)).toStrictEqual(originalValue)
      expect(shape.isDirty(scope)).toBe(false)
    })
  })

  it("resets to initial value by consuming current original value with resetter", ({
    scope,
  }) => {
    const shape = setup()

    shape.reset((_, current) => current)
    const originalValue = shape.getOriginalValue(scope)
    expect(originalValue).toStrictEqual({
      first: "",
      second: 0,
      third: {
        one: true,
        two: [""],
      },
      fourth: ["anything"],
    })
    expect(shape.getInitialValue(scope)).toStrictEqual(originalValue)
    expect(shape.isDirty(scope)).toBe(false)
  })

  it("resets to new initial value", ({ scope }) => {
    const shape = setup()

    shape.reset({
      first: "3",
      third: {
        one: true,
        two: undefined,
      },
    })
    const originalValue = shape.getOriginalValue(scope)
    expect(originalValue).toStrictEqual({
      first: "3",
      second: 2,
      third: {
        one: true,
        two: ["two"],
      },
      fourth: ["anything"],
    })
    expect(shape.getInitialValue(scope)).toStrictEqual(originalValue)
    expect(shape.isDirty(scope)).toBe(false)
  })

  it("resets with callback on each field", ({ scope }) => {
    const shape = setup()

    shape.reset((initial, current) => {
      expect(initial).toStrictEqual({
        first: "1",
        second: 2,
        third: {
          one: false,
          two: ["two"],
        },
        fourth: ["anything"],
      })
      expect(current).toStrictEqual({
        first: "",
        second: 0,
        third: {
          one: true,
          two: [""],
        },
        fourth: ["anything"],
      })

      return {
        first: (x, y) => {
          expect(x).toBe("1")
          expect(y).toBe("")

          return "3"
        },
        second: (x, y) => {
          expect(x).toBe(2)
          expect(y).toBe(0)

          return 4
        },
        third: (x, y) => {
          expect(x).toStrictEqual({
            one: false,
            two: ["two"],
          })
          expect(y).toStrictEqual({
            one: true,
            two: [""],
          })

          return {
            one: (a, b) => {
              expect(a).toBe(false)
              expect(b).toBe(true)

              return true
            },
            two: (a, b) => {
              expect(a).toStrictEqual(["two"])
              expect(b).toStrictEqual([""])

              return ["three"]
            },
          }
        },
      }
    })

    const originalValue = shape.getOriginalValue(scope)
    expect(originalValue).toStrictEqual({
      first: "3",
      second: 4,
      third: {
        one: true,
        two: ["three"],
      },
      fourth: ["anything"],
    })
    expect(shape.getInitialValue(scope)).toStrictEqual(originalValue)
    expect(shape.isDirty(scope)).toBe(false)
  })
})
