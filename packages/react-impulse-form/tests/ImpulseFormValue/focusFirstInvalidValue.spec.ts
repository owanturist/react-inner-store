import { z } from "zod"

import { type ImpulseFormValueOptions, ImpulseFormValue } from "../../src"

const setup = (input?: string, options?: ImpulseFormValueOptions<string>) => {
  return ImpulseFormValue.of(input ?? "", {
    touched: true,
    schema: z.string().min(2),
    ...options,
  })
}

it("matches the type signature", () => {
  const form = setup()

  expectTypeOf(form.focusFirstInvalidValue).toEqualTypeOf<VoidFunction>()
})

describe("focusFirstInvalidValue() when validated", () => {
  it("nothing happens if a listener is not attached", () => {
    const form = setup()
    const spy = vi.spyOn(form, "focusFirstInvalidValue")

    expect(() => {
      form.focusFirstInvalidValue()
    }).not.toThrow()

    expect(spy).toHaveBeenCalledOnce()
  })

  it("does not call a listener on subscribe", () => {
    const form = setup()
    const listener = vi.fn()

    form.onFocusWhenInvalid(listener)

    expect(listener).not.toHaveBeenCalled()
  })

  it("calls a listener function", () => {
    const form = setup()
    const listener = vi.fn()

    form.onFocusWhenInvalid(listener)

    form.focusFirstInvalidValue()
    expect(listener).toHaveBeenCalledOnce()
  })

  it("calls a listener function with a validation error", () => {
    const form = setup()
    const listener = vi.fn()

    form.onFocusWhenInvalid(listener)

    form.focusFirstInvalidValue()
    expect(listener).toHaveBeenLastCalledWith([
      "String must contain at least 2 character(s)",
    ])
  })

  it("calls a listener with a custom errors", () => {
    const form = setup("", { error: ["Custom error"] })
    const listener = vi.fn()

    form.onFocusWhenInvalid(listener)

    form.focusFirstInvalidValue()
    expect(listener).toHaveBeenLastCalledWith(["Custom error"])
  })

  it("calls all listeners", () => {
    const form = setup()
    const listener_1 = vi.fn()
    const listener_2 = vi.fn()

    form.onFocusWhenInvalid(listener_1)
    form.onFocusWhenInvalid(listener_2)

    form.focusFirstInvalidValue()
    expect(listener_1).toHaveBeenCalledOnce()
    expect(listener_2).toHaveBeenCalledOnce()
  })

  it("calls a listener per each focusFirstInvalidValue()", () => {
    const form = setup()
    const listener = vi.fn()

    form.onFocusWhenInvalid(listener)

    form.focusFirstInvalidValue()
    form.focusFirstInvalidValue()
    form.focusFirstInvalidValue()
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it("does not call a listener after it is unsubscribed", () => {
    const form = setup()
    const listener = vi.fn()

    const unsubscribe = form.onFocusWhenInvalid(listener)

    form.focusFirstInvalidValue()
    expect(listener).toHaveBeenCalledTimes(1)
    listener.mockClear()

    unsubscribe()
    form.focusFirstInvalidValue()
    expect(listener).not.toHaveBeenCalled()
  })

  it("subscribes the same listener only once", () => {
    const form = setup()
    const listener = vi.fn()

    form.onFocusWhenInvalid(listener)
    form.onFocusWhenInvalid(listener)

    form.focusFirstInvalidValue()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("unsubscribes the same listener as many times as it's been subscribed", () => {
    const form = setup()
    const listener = vi.fn()

    const unsubscribe_1 = form.onFocusWhenInvalid(listener)
    const unsubscribe_2 = form.onFocusWhenInvalid(listener)
    const unsubscribe_3 = form.onFocusWhenInvalid(listener)

    form.focusFirstInvalidValue()
    expect(listener).toHaveBeenCalled()
    listener.mockClear()

    unsubscribe_1()
    form.focusFirstInvalidValue()
    expect(listener).toHaveBeenCalled()
    listener.mockClear()

    unsubscribe_2()
    form.focusFirstInvalidValue()
    expect(listener).toHaveBeenCalled()
    listener.mockClear()

    unsubscribe_3()
    form.focusFirstInvalidValue()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe("focusFirstInvalidValue() when not validated", () => {
  it("does not call a listener", () => {
    const form = setup("", { touched: false })
    const listener = vi.fn()

    form.onFocusWhenInvalid(listener)

    expect(listener).not.toHaveBeenCalled()
  })
})

describe("focusFirstInvalidValue() when valid", () => {
  it("does not call a listener", () => {
    const form = setup("123")
    const listener = vi.fn()

    form.onFocusWhenInvalid(listener)

    expect(listener).not.toHaveBeenCalled()
  })
})
