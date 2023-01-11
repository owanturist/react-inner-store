import { useState } from "react"

import { WarningSource } from "./validation"
import { WatchContext } from "./WatchContext"

interface UseWatchContextResult {
  executeWatcher: <T>(watcher: () => T) => T
  getVersion: () => number
  subscribe: (onStoreChange: VoidFunction) => VoidFunction
}

/**
 * @private
 */
export const useWatchContext = ({
  warningSource,
}: {
  warningSource: null | WarningSource
}): UseWatchContextResult => {
  const [result] = useState<UseWatchContextResult>(() => {
    const context = new WatchContext(warningSource)

    return {
      executeWatcher: (watcher) => context.watchStores(watcher),

      // the getValue cannot directly return the watcher result
      // because it might be different per each call
      // instead it increments the version each time when any watched impulse changes
      // so the getValue will be consistent over multiple calls until the real change happens
      // when the version changes the select function calls the watcher and extracts actual data
      // without that workaround it will go to the re-render hell
      getVersion: () => context.getVersion(),

      subscribe: (onStoreChange) => context.subscribe(onStoreChange),
    }
  })

  return result
}
