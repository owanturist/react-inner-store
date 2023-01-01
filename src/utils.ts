/**
 * A function that compares two values and returns `true` if they are equal.
 * Depending on the type of the values it might be reasonable to use
 * a custom compare function such as shallow-equal or deep-equal.
 */
export type Compare<T> = (left: T, right: T) => boolean

/**
 * @private
 */
export const isEqual: Compare<unknown> = Object.is

const isDefined = <T>(value: undefined | null | T): value is T => value != null

/**
 * @private
 */
// TODO use ?? instead
export const overrideCompare = <T>(
  lowest: Compare<T>,
  ...overrides: Array<undefined | null | Compare<T>>
): Compare<T> => {
  const [override = lowest] = overrides
    .map((compare) => (compare === null ? isEqual : compare))
    .filter(isDefined)
    .slice(-1)

  return override
}

/**
 * @private
 */
export const noop: VoidFunction = () => {
  // do nothing
}

export const isFunction = <
  TFunction extends (...args: Array<never>) => unknown,
>(
  anything: unknown,
): anything is TFunction => {
  return typeof anything === "function"
}
