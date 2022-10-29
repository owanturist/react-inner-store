import { FC } from "react"
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/shim/with-selector.js"

import { useWatchContext } from "./useWatchContext"

export function watch<TProps extends object>(fc: FC<TProps>): FC<TProps> {
  const SweetyWatcher: FC<TProps> = (props, ctx) => {
    const { context, subscribe, getState } = useWatchContext()

    return useSyncExternalStoreWithSelector(
      subscribe,
      getState,
      getState,
      () => {
        return context.watchStores(() => fc(props, ctx))
      },
    )
  }

  return SweetyWatcher
}
