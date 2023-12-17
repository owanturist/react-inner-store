import { useCallback, useSyncExternalStoreWithSelector } from "./dependencies"
import { ScopeEmitter } from "./ScopeEmitter"
import { EMITTER_KEY, type Scope } from "./Scope"
import { type Compare, isFunction, usePermanent } from "./utils"

export function useScope<T = () => Scope>(
  transform?: (scope: Scope) => T,
  compare?: Compare<T>,
): T {
  const emitter = usePermanent(ScopeEmitter._init)
  const select = useCallback(
    (version: number) => {
      const getScope = (): Scope => {
        emitter._detachAll()

        return {
          [EMITTER_KEY]: emitter,
          version,
        }
      }

      return isFunction(transform) ? transform(getScope()) : (getScope as T)
    },
    [emitter, transform],
  )

  return useSyncExternalStoreWithSelector(
    emitter._onEmit,
    emitter._getVersion,
    emitter._getVersion,
    select,
    compare,
  )
}
