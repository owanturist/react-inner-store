import { SCOPE_KEY, Scope } from "./Scope"
import { WatchContext } from "./WatchContext"

/**
 * A function that subscribes to changes of all `Impulse` instances that call the `Impulse#getValue` method inside the `listener`.
 *
 * @param listener function that will be called on each `Impulse` change, involved in the `listener` execution. Calls first time synchronously when `subscribe` is called.
 * @returns cleanup function that unsubscribes the `listener`
 */
export const subscribe = (listener: (scope: Scope) => void): VoidFunction => {
  const context = new WatchContext()

  listener({
    [SCOPE_KEY]: context,
    version: context.getVersion(),
  })

  return context.subscribe(() => {
    listener({
      [SCOPE_KEY]: context,
      version: context.getVersion(),
    })
  })
}