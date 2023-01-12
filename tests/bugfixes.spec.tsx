import { act, fireEvent, render, screen } from "@testing-library/react"
import React from "react"

import { Impulse, watch, useImpulseValue, useWatchImpulse } from "../src"

describe("watching misses when defined after useEffect #140", () => {
  interface ComponentProps {
    first: Impulse<number>
    second: Impulse<number>
    useGetFirst(first: Impulse<number>): number
    useGetSecond(second: Impulse<number>): number
  }

  const ComponentWatchBeforeEffect: React.FC<ComponentProps> = ({
    first,
    second,
    useGetFirst,
    useGetSecond,
  }) => {
    const x = useGetFirst(first)
    const y = useGetSecond(second)

    React.useEffect(() => {
      second.setValue(x)
    }, [second, x])

    return (
      <button type="button" onClick={() => first.setValue(x + 1)}>
        {y}
      </button>
    )
  }

  const ComponentWatchAfterEffect: React.FC<ComponentProps> = ({
    first,
    second,
    useGetFirst,
    useGetSecond,
  }) => {
    const x = useGetFirst(first)

    React.useEffect(() => {
      second.setValue(x)
    }, [second, x])

    const y = useGetSecond(second)

    return (
      <button type="button" onClick={() => first.setValue(x + 1)}>
        {y}
      </button>
    )
  }

  const useWatchInline = (impulse: Impulse<number>) => {
    return useWatchImpulse(() => impulse.getValue())
  }

  const useWatchMemoized = (impulse: Impulse<number>) => {
    return useWatchImpulse(
      React.useCallback(() => impulse.getValue(), [impulse]),
    )
  }

  describe.each([
    ["before", ComponentWatchBeforeEffect],
    ["after", ComponentWatchAfterEffect],
  ])("calls depending hook %s useEffect", (_, Component) => {
    describe.each([
      ["useImpulseValue", useImpulseValue],
      ["inline useWatchImpulse", useWatchInline],
      ["memoized useWatchImpulse", useWatchMemoized],
    ])("with %s as useGetFirst", (__, useGetFirst) => {
      it.each([
        ["useImpulseValue", useImpulseValue],
        ["inline useWatchImpulse", useWatchInline],
        ["memoized useWatchImpulse", useWatchMemoized],
      ])("with %s as useGetSecond", (___, useGetSecond) => {
        const first = Impulse.of(0)
        const second = Impulse.of(5)

        render(
          <Component
            first={first}
            second={second}
            useGetFirst={useGetFirst}
            useGetSecond={useGetSecond}
          />,
        )

        const button = screen.getByRole("button")
        expect(button).toHaveTextContent("0")

        fireEvent.click(button)
        expect(button).toHaveTextContent("1")

        fireEvent.click(button)
        expect(button).toHaveTextContent("2")

        act(() => {
          first.setValue(10)
        })
        expect(button).toHaveTextContent("10")

        fireEvent.click(button)
        expect(button).toHaveTextContent("11")

        act(() => {
          second.setValue(20)
        })
        expect(button).toHaveTextContent("20")

        fireEvent.click(button)
        expect(button).toHaveTextContent("12")
      })
    })
  })
})

describe("Use Impulse#getValue() in Impulse#toJSON() and Impulse#toString() #321", () => {
  it.each([
    ["toString", (value: unknown) => String(value)],
    ["toJSON", (value: unknown) => JSON.stringify(value)],
  ])("watches %s execution", (_, convert) => {
    const Component: React.FC<{
      count: Impulse<number>
    }> = ({ count }) => {
      const x = useWatchImpulse(() => convert(count))

      return <span data-testid="result">{x}</span>
    }

    const count = Impulse.of(1)
    render(<Component count={count} />)

    const result = screen.getByTestId("result")
    expect(result).toHaveTextContent("1")

    act(() => {
      count.setValue(2)
    })
    expect(result).toHaveTextContent("2")
  })
})

describe("return the same component type from watch #322", () => {
  const StatelessInput: React.FC<{
    value: string
    onChange: React.Dispatch<string>
  }> = ({ value, onChange }) => (
    <input value={value} onChange={(event) => onChange(event.target.value)} />
  )

  const StatefulInput: React.FC<{
    value: Impulse<string>
  }> = watch(({ value }) => (
    <StatelessInput
      value={value.getValue()}
      onChange={(nextValue) => value.setValue(nextValue)}
    />
  ))

  const Input = Object.assign(StatefulInput, { Stateless: StatelessInput })

  it("watches the StatefulInput", () => {
    const text = Impulse.of("hello")
    render(<Input value={text} />)

    const first = screen.getByRole("textbox")
    expect(first).toHaveValue("hello")

    act(() => {
      text.setValue("world")
    })
    expect(first).toHaveValue("world")
  })
})
