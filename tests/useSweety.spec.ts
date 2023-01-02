import { renderHook } from "@testing-library/react-hooks"

import { useSweety } from "../src"

import { Counter } from "./common"

describe("with direct initial value", () => {
  it.concurrent("creates a store with an initial value", () => {
    const initial = { count: 0 }

    const { result } = renderHook(() => useSweety(initial))

    expect(result.current.getState()).toBe(initial)
    expect(result.current.getState()).toStrictEqual({ count: 0 })
  })

  it.concurrent("keeps the same store during re-renders", () => {
    const initial = { count: 0 }

    const { result, rerender } = renderHook(() => useSweety(initial))

    const firstResult = result.current

    rerender(initial)

    expect(result.current).toBe(firstResult)
    expect(result.current.getState()).toStrictEqual({ count: 0 })
  })

  it.concurrent(
    "does not create new store when the initial value changes",
    () => {
      const initial = { count: 0 }

      const { result, rerender } = renderHook(() => useSweety(initial))

      const firstResult = result.current

      rerender({ count: 1 })

      expect(result.current).toBe(firstResult)
      expect(result.current.getState()).toStrictEqual({ count: 0 })
    },
  )
})

describe("with lazy initial value", () => {
  it.concurrent("creates a store with an initial value", () => {
    const initial = { count: 0 }
    const init = vi.fn(() => initial)

    const { result } = renderHook(() => useSweety(init))

    expect(result.current.getState()).toBe(initial)
    expect(result.current.getState()).toStrictEqual({ count: 0 })
    expect(init).toHaveBeenCalledTimes(1)
  })

  it.concurrent("keeps the same store during re-renders", () => {
    const initial = { count: 0 }
    const init = vi.fn(() => initial)

    const { result, rerender } = renderHook(() => useSweety(init))

    const firstResult = result.current

    rerender(init)

    expect(result.current).toBe(firstResult)
    expect(result.current.getState()).toStrictEqual({ count: 0 })
    expect(init).toHaveBeenCalledTimes(1)
  })

  it.concurrent(
    "does not create new store when the init return value changes",
    () => {
      let initial = { count: 0 }
      const init = vi.fn(() => initial)

      const { result, rerender } = renderHook(() => useSweety(init))

      const firstResult = result.current

      initial = { count: 1 }
      rerender(init)

      expect(result.current).toBe(firstResult)
      expect(result.current.getState()).toStrictEqual({ count: 0 })
      expect(init).toHaveBeenCalledTimes(1)
    },
  )

  it.concurrent(
    "does not create new store when the init function changes",
    () => {
      const initial = { count: 0 }
      let init = vi.fn(() => initial)

      const { result, rerender } = renderHook(() => useSweety(init))

      const firstResult = result.current

      init = vi.fn(() => initial)
      rerender(init)

      expect(result.current).toBe(firstResult)
      expect(result.current.getState()).toStrictEqual({ count: 0 })
      expect(init).not.toHaveBeenCalled()
    },
  )
})

describe("with compare function", () => {
  it.concurrent("applies Object.is by default", () => {
    const { result } = renderHook(() => useSweety({ count: 0 }))

    expect(result.current.compare).toBe(Object.is)
  })

  it.concurrent("applies Object.is when passing null as compare", () => {
    const { result } = renderHook(() => useSweety({ count: 0 }, null))

    expect(result.current.compare).toBe(Object.is)
  })

  it.concurrent("passes custom compare function", () => {
    const { result } = renderHook(() =>
      useSweety({ count: 0 }, Counter.compare),
    )

    expect(result.current.compare).toBe(Counter.compare)
  })
})
