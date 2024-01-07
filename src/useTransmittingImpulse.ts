import type { DependencyList } from "./dependencies"
import {
  Impulse,
  type TransmittingImpulse,
  type ReadonlyImpulse,
  type TransmittingImpulseOptions,
} from "./Impulse"
import type { Scope } from "./Scope"
import {
  noop,
  eq,
  useStableCallback,
  usePermanent,
  useIsomorphicLayoutEffect,
  isFunction,
  type Func,
} from "./utils"

/**
 * A hook that initialize a stable (never changing) transmitting ReadonlyImpulse.
 * A transmitting Impulse is an Impulse that does not have its own value but reads it from the external source.
 *
 * @param getter a function to read the transmitting value from a source.
 * @param dependencies an array of values triggering the re-read of the transmitting value.
 * @param options optional `TransmittingImpulseOptions`.
 * @param options.compare when not defined or `null` then `Object.is` applies as a fallback.
 *
 * @version 2.0.0
 */
export function useTransmittingImpulse<T>(
  getter: (scope: Scope) => T,
  dependencies: DependencyList,
  options?: TransmittingImpulseOptions<T>,
): ReadonlyImpulse<T>

/**
 * A hook that initialize a stable (never changing) transmitting Impulse.
 * A transmitting Impulse is an Impulse that does not have its own value but reads it from the external source and writes it back.
 *
 * @param getter either a source impulse or a function to read the transmitting value from a source.
 * @param dependencies an array of values triggering the re-read of the transmitting value.
 * @param setter either a destination impulse or a function to write the transmitting value back to a source.
 * @param options optional `TransmittingImpulseOptions`.
 * @param options.compare when not defined or `null` then `Object.is` applies as a fallback.
 *
 * @version 2.0.0
 */
export function useTransmittingImpulse<T>(
  getter: ReadonlyImpulse<T> | ((scope: Scope) => T),
  dependencies: DependencyList,
  setter: Impulse<T> | ((value: T, scope: Scope) => void),
  options?: TransmittingImpulseOptions<T>,
): Impulse<T>

export function useTransmittingImpulse<T>(
  getter: ReadonlyImpulse<T> | Func<[Scope], T>,
  dependencies: DependencyList,
  ...rest:
    | [options?: TransmittingImpulseOptions<T>]
    | [
        setter: Impulse<T> | Func<[T, Scope]>,
        options?: TransmittingImpulseOptions<T>,
      ]
): Impulse<T> {
  const [setter, options] =
    isFunction(rest[0]) || rest[0] instanceof Impulse
      ? [rest[0], rest[1]]
      : [noop, rest[0]]

  const stableSetter = useStableCallback((value: T, scope: Scope) => {
    if (isFunction(setter)) {
      setter(value, scope)
    } else {
      setter.setValue(value)
    }
  })
  const stableCompare = useStableCallback(options?.compare ?? eq)
  const impulse = usePermanent(() => {
    return Impulse.transmit(getter, stableSetter, {
      compare: stableCompare,
    })
  }) as TransmittingImpulse<T>

  useIsomorphicLayoutEffect(
    () => {
      const nextGetter = isFunction(getter)
        ? getter
        : (scope: Scope) => getter.getValue(scope)

      impulse._replaceGetter(nextGetter)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    dependencies,
  )

  return impulse
}
