import type { SetStateAction } from "react"

import { Compare, isEqual, isFunction, noop } from "./utils"
import { WatchContext } from "./WatchContext"
import { SetStateContext } from "./SetStateContext"
import {
  WARNING_MESSAGE_CALLING_CLONE_WHEN_WATCHING,
  WARNING_MESSAGE_CALLING_OF_WHEN_WATCHING,
  WARNING_MESSAGE_CALLING_SET_STATE_WHEN_WATCHING,
  WARNING_MESSAGE_CALLING_SUBSCRIBE_WHEN_WATCHING,
} from "./validation"

export class Impulse<T> {
  /**
   * Creates new Impulse.
   *
   * @param initialState the initial state.
   * @param compare an optional `Compare` function applied as `Impulse#compare`. When not defined or `null` then `Object.is` applies as a fallback.
   *
   * @version 1.0.0
   */
  public static of<T>(
    initialState: T,
    compare?: null | Compare<T>,
  ): Impulse<T> {
    WatchContext.warning(WARNING_MESSAGE_CALLING_OF_WHEN_WATCHING)

    return new Impulse(initialState, compare ?? isEqual)
  }

  /**
   * It does not use `Set<VoidFunction>` here because the same listener might be subscribed
   * many times to an Impulse, so it should not unsubscribe them all when one unsubscribes.
   * By keeping track of how many times the same listener is subscribed it knows when to drop
   * the listener from `subscribers`.
   */
  private readonly subscribers = new Map<VoidFunction, number>()

  /**
   * The `Compare` function compares Impulse's state with the new state given via `Impulse#setState`.
   * Whenever the function returns `true`, neither the state change nor it notifies the listeners subscribed via `Impulse#subscribe`.
   *
   * @version 1.0.0
   */
  public readonly compare: Compare<T>

  private constructor(private value: T, compare: Compare<T>) {
    this.compare = compare
  }

  /**
   * Return the state when serializing to JSON.
   * It does not encode an Impulse for decoding it back due to runtime parts of the class,
   * that cannot be serialized as JSON.
   *
   * The method is protected in order to make it impossible to make the implicit call.
   *
   * @version 1.0.0
   */
  protected toJSON(): unknown {
    return this.getState()
  }

  /**
   * Return the stringified state when an Impulse converts to a string.
   *
   * The method is protected in order to make it impossible to make the implicit call.
   * @version 1.0.0
   */
  protected toString(): string {
    return String(this.getState())
  }

  /**
   * Clones an Impulse.
   *
   * @param transform an optional function that applies to the current state before cloning. It might be handy when cloning a state that contains mutable values.
   * @param compare an optional `Compare` function applied as `Impulse#compare`. When not defined, it uses the `Impulse#compare` function from the origin. When `null` the `Object.is` function applies to compare the states.
   *
   * @version 1.0.0
   */
  public clone(
    transform?: (value: T) => T,
    compare: null | Compare<T> = this.compare,
  ): Impulse<T> {
    WatchContext.warning(WARNING_MESSAGE_CALLING_CLONE_WHEN_WATCHING)

    return new Impulse(
      isFunction(transform) ? transform(this.value) : this.value,
      compare ?? isEqual,
    )
  }

  /**
   * Returns the current state.
   *
   * @version 1.0.0
   */
  public getState(): T
  /**
   * Returns a value selected from the current state.
   *
   * @param select an optional function that applies to the current state before returning.
   *
   * @version 1.0.0
   */
  public getState<R>(select: (value: T) => R): R
  public getState<R>(select?: (value: T) => R): T | R {
    WatchContext.register(this as Impulse<unknown>)

    return isFunction(select) ? select(this.value) : this.value
  }

  /**
   * Updates the state.
   * All listeners registered via the `Impulse#subscribe` method execute whenever the Impulse's state updates.
   *
   * @param stateOrTransform either the new state or a function that transforms the current state into the new state.
   * @param compare an optional `Compare` function applied for this call only. When not defined the `Impulse#compare` function will be used. When `null` the `Object.is` function applies to compare the states.
   *
   * @returns `void` to emphasize that Impulses are mutable.
   *
   * @version 1.0.0
   */
  public setState(
    stateOrTransform: SetStateAction<T>,
    compare: null | Compare<T> = this.compare,
  ): void {
    if (WatchContext.warning(WARNING_MESSAGE_CALLING_SET_STATE_WHEN_WATCHING)) {
      return
    }

    const finalCompare = compare ?? isEqual
    const [emit, register] = SetStateContext.registerStoreSubscribers()

    const nextValue = isFunction(stateOrTransform)
      ? stateOrTransform(this.value)
      : stateOrTransform

    if (!finalCompare(this.value, nextValue)) {
      this.value = nextValue
      register(this.subscribers)
    }

    emit()
  }

  /**
   * Subscribes to the state's updates caused by calling `Impulse#setState`.
   *
   * @param listener a function that subscribes to the updates.
   *
   * @returns a cleanup function that unsubscribes the `listener`.
   *
   * @version 1.0.0
   */
  public subscribe(listener: VoidFunction): VoidFunction {
    if (WatchContext.warning(WARNING_MESSAGE_CALLING_SUBSCRIBE_WHEN_WATCHING)) {
      return noop
    }

    const countWhenSubscribes = this.subscribers.get(listener) ?? 0

    this.subscribers.set(listener, countWhenSubscribes + 1)

    return () => {
      const countWhenUnsubscribes = this.subscribers.get(listener) ?? 0

      if (countWhenUnsubscribes > 1) {
        this.subscribers.set(listener, countWhenUnsubscribes - 1)
      } else {
        this.subscribers.delete(listener)
      }
    }
  }
}