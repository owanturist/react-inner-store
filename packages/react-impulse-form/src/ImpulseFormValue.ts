import {
  type Compare,
  type Scope,
  Impulse,
  batch,
  untrack,
} from "./dependencies"
import {
  type Result,
  type Setter,
  shallowArrayEquals,
  eq,
  resolveSetter,
  isUndefined,
  isNull,
  params,
  type WhenNull,
  type Func,
  isArray,
} from "./utils"
import { ImpulseForm } from "./ImpulseForm"
import { zodLikeParse, type ZodLikeSchema } from "./ZodLikeSchema"
import {
  VALIDATE_ON_INIT,
  VALIDATE_ON_CHANGE,
  VALIDATE_ON_TOUCH,
  type ValidateStrategy,
  VALIDATE_ON_SUBMIT,
} from "./ValidateStrategy"
import { Emitter } from "./Emitter"

export interface ImpulseFormValueOptions<TInput, TError = null> {
  error?: null | TError
  touched?: boolean

  /**
   * A compare function that determines whether the input value changes.
   * When it does, the ImpulseFormValue#getInput returns the new value.
   * Otherwise, it returns the previous value.
   *
   * Useful for none primitive values such as Objects, Arrays, Date.
   * Intended to improve performance but do not affect business logic.
   *
   * @default Object.is
   *
   * @example
   * const initial = { count: 0 }
   *
   * const form = ImpulseFormValue.of(initial, {
   *   isInputEqual: (left, right) => left.count === right.count,
   * })
   *
   * form.setInput({ count: 0 })
   * form.getInput(scope) === initial // true
   */
  isInputEqual?: Compare<TInput>

  /**
   * A compare function that determines whether the input is dirty.
   * When it is, the ImpulseFormValue#isDirty returns true.
   * Fallbacks to not(isInputEqual) if not provided.
   *
   * Useful for values that have intermediate states deviating from the initial value,
   * but should not be considered dirty such as strings, unsorted arrays, etc.
   * Intended to tune business logic and avoid false positives for dirty states.
   *
   * @default not(isInputEqual)
   *
   * @example
   * const form = ImpulseFormValue.of("", {
   *   isInputDirty: (left, right) => left.trim() !== right.trim(),
   * })
   *
   * form.setInput(" ")
   * form.isDirty(scope) === false
   */
  isInputDirty?: Compare<TInput>

  /**
   * @default input
   */
  initial?: TInput

  /**
   * @default "onTouch"
   */
  validateOn?: ValidateStrategy
}

export interface ImpulseFormValueOptionsWithSchema<TInput, TOutput = TInput>
  extends ImpulseFormValueOptions<TInput, ReadonlyArray<string>> {
  schema: ZodLikeSchema<TOutput>
}

export interface ImpulseFormValueOptionsWithValidate<
  TInput,
  TError = null,
  TOutput = TInput,
> extends ImpulseFormValueOptions<TInput, TError> {
  validate: (input: TInput) => Result<TError, TOutput>
}

export type ImpulseFormValueInputSetter<TInput> = Setter<
  TInput,
  [TInput, TInput]
>

export type ImpulseFormValueOutputSchema<TError, TOutput> = WhenNull<
  TError,
  TOutput,
  null | TOutput
>

export type ImpulseFormValueOutputSchemaVerbose<TError, TOutput> = WhenNull<
  TError,
  TOutput,
  null | TOutput
>

export type ImpulseFormValueFlagSetter = Setter<boolean>

export type ImpulseFormValueValidateOnSetter<TError> = WhenNull<
  TError,
  never,
  Setter<ValidateStrategy>
>

export type ImpulseFormValueValidateOnSchema<TError> = WhenNull<
  TError,
  typeof VALIDATE_ON_INIT,
  ValidateStrategy
>

export type ImpulseFormValueErrorSetter<TError> = WhenNull<
  TError,
  never,
  Setter<null | TError>
>

export class ImpulseFormValue<
  TInput,
  TError = null,
  TOutput = TInput,
> extends ImpulseForm<{
  "input.setter": ImpulseFormValueInputSetter<TInput>
  "input.schema": TInput

  "output.schema": ImpulseFormValueOutputSchema<TError, TOutput>
  "output.schema.verbose": ImpulseFormValueOutputSchemaVerbose<TError, TOutput>

  "flag.setter": ImpulseFormValueFlagSetter
  "flag.schema": boolean
  "flag.schema.verbose": boolean

  "validateOn.setter": ImpulseFormValueValidateOnSetter<TError>
  "validateOn.schema": ImpulseFormValueValidateOnSchema<TError>
  "validateOn.schema.verbose": ImpulseFormValueValidateOnSchema<TError>

  "error.setter": ImpulseFormValueErrorSetter<TError>
  "error.schema": null | TError
  "error.schema.verbose": null | TError
}> {
  public static of<TInput, TError = null>(
    input: TInput,
    options?: ImpulseFormValueOptions<TInput, TError>,
  ): ImpulseFormValue<TInput, TError>

  public static of<TInput, TOutput = TInput>(
    input: TInput,
    options: ImpulseFormValueOptionsWithSchema<TInput, TOutput>,
  ): ImpulseFormValue<TInput, ReadonlyArray<string>, TOutput>

  public static of<TInput, TError = null, TOutput = TInput>(
    input: TInput,
    options: ImpulseFormValueOptionsWithValidate<TInput, TError, TOutput>,
  ): ImpulseFormValue<TInput, TError, TOutput>

  public static of<TInput, TError = null, TOutput = TInput>(
    input: TInput,
    options:
      | ImpulseFormValueOptions<TInput, TError>
      | ImpulseFormValueOptionsWithSchema<TInput, TOutput>
      | ImpulseFormValueOptionsWithValidate<TInput, TError, TOutput> = {},
  ):
    | ImpulseFormValue<TInput, TError, TOutput>
    | ImpulseFormValue<TInput, ReadonlyArray<string>, TOutput>
    | ImpulseFormValue<TInput, TError> {
    if ("validate" in options) {
      return ImpulseFormValue.initImpulseWithValidate(input, options)
    }

    if ("schema" in options) {
      return ImpulseFormValue.initImpulseWithSchema(input, options)
    }

    return ImpulseFormValue.initImpulse(input, options)
  }

  private static initImpulseWithValidate<TInput, TError, TOutput>(
    input: TInput,
    {
      touched = false,
      isInputEqual = eq,
      isInputDirty = (left, right, scope) => !isInputEqual(left, right, scope),
      initial,
      validateOn = VALIDATE_ON_TOUCH,
      error = null,
      validate,
    }: ImpulseFormValueOptionsWithValidate<TInput, TError, TOutput>,
  ): ImpulseFormValue<TInput, TError, TOutput> {
    const _initial = isUndefined(initial) ? input : initial

    // initiate with the same value if specified but equal
    const inputOrInitial = untrack((scope) => {
      if (isInputEqual(_initial, input, scope)) {
        return _initial
      }

      return input
    })

    return new ImpulseFormValue<TInput, TError, TOutput>(
      null,
      isInputEqual,
      isInputDirty,
      Impulse.of(),
      Impulse.of(touched),
      Impulse.of(validateOn),
      Impulse.of(error),
      Impulse.of(!isUndefined(initial)),
      Impulse.of(_initial, { compare: isInputEqual }),
      Impulse.of(inputOrInitial, { compare: isInputEqual }),
      Impulse.of(validate),
    )
  }

  private static initImpulseWithSchema<TInput, TOutput>(
    input: TInput,
    {
      touched = false,
      isInputEqual = eq,
      isInputDirty = (left, right, scope) => !isInputEqual(left, right, scope),
      initial,
      validateOn = VALIDATE_ON_TOUCH,
      error = null,
      schema,
    }: ImpulseFormValueOptionsWithSchema<TInput, TOutput>,
  ): ImpulseFormValue<TInput, ReadonlyArray<string>, TOutput> {
    const _initial = isUndefined(initial) ? input : initial

    // initiate with the same value if specified but equal
    const inputOrInitial = untrack((scope) => {
      if (isInputEqual(_initial, input, scope)) {
        return _initial
      }

      return input
    })

    return new ImpulseFormValue<TInput, ReadonlyArray<string>, TOutput>(
      null,
      isInputEqual,
      isInputDirty,
      Impulse.of(),
      Impulse.of(touched),
      Impulse.of(validateOn),
      Impulse.of(error, {
        compare: (left, right) => {
          if (isArray(left) && isArray(right)) {
            return shallowArrayEquals(left, right)
          }

          return eq(left, right)
        },
      }),
      Impulse.of(!isUndefined(initial)),
      Impulse.of(_initial, { compare: isInputEqual }),
      Impulse.of(inputOrInitial, { compare: isInputEqual }),
      Impulse.of((value) => zodLikeParse(schema, value)),
    )
  }

  private static initImpulse<TInput, TError>(
    input: TInput,
    {
      touched = false,
      isInputEqual = eq,
      isInputDirty = (left, right, scope) => !isInputEqual(left, right, scope),
      initial,
      validateOn = VALIDATE_ON_TOUCH,
      error = null,
    }: ImpulseFormValueOptions<TInput, TError>,
  ): ImpulseFormValue<TInput, TError> {
    const _initial = isUndefined(initial) ? input : initial

    // initiate with the same value if specified but equal
    const inputOrInitial = untrack((scope) => {
      if (isInputEqual(_initial, input, scope)) {
        return _initial
      }

      return input
    })

    return new ImpulseFormValue<TInput, TError, TInput>(
      null,
      isInputEqual,
      isInputDirty,
      Impulse.of(),
      Impulse.of(touched),
      Impulse.of(validateOn),
      Impulse.of(error),
      Impulse.of(!isUndefined(initial)),
      Impulse.of(_initial, { compare: isInputEqual }),
      Impulse.of(inputOrInitial, { compare: isInputEqual }),
      Impulse.of((value): Result<TError, TInput> => [null, value]),
    )
  }

  private readonly _onFocus = new Emitter<[errors: TError]>()

  private readonly _validated = Impulse.of(false)

  protected constructor(
    root: null | ImpulseForm,
    private readonly _isInputEqual: Compare<TInput>,
    private readonly _isInputDirty: Compare<TInput>,
    private readonly _initialSource: Impulse<
      undefined | ImpulseFormValue<TInput, TError, TOutput>
    >,
    private readonly _touched: Impulse<boolean>,
    // TODO convert to undefined | ValidateStrategy so it can inherit from parent (List)
    private readonly _validateOn: Impulse<ValidateStrategy>,
    private readonly _error: Impulse<null | TError>,
    private readonly _isExplicitInitial: Impulse<boolean>,
    private readonly _initial: Impulse<TInput>,
    private readonly _input: Impulse<TInput>,
    private readonly _validate: Impulse<
      Func<[TInput], Result<TError, TOutput>>
    >,
  ) {
    super(root)
    this._updateValidated()
  }

  private _updateValidated(override: boolean = false): void {
    this._validated.setValue((isValidated, scope) => {
      if (!override && isValidated) {
        return true
      }

      switch (this._validateOn.getValue(scope)) {
        case VALIDATE_ON_INIT: {
          return true
        }

        case VALIDATE_ON_TOUCH: {
          return this.isTouched(scope)
        }

        case VALIDATE_ON_CHANGE: {
          return this.isDirty(scope)
        }

        case VALIDATE_ON_SUBMIT: {
          return false
        }
      }
    })
  }

  private _transform(scope: Scope): Result<TError, null | TOutput> {
    const error = this._error.getValue(scope)

    if (error != null) {
      return [error, null] as Result<TError, null>
    }

    if (!this._validated.getValue(scope)) {
      return [null, null]
    }

    const value = this.getInput(scope)
    const validate = this._validate.getValue(scope)

    return validate(value)
  }

  protected _getFocusFirstInvalidValue(): null | VoidFunction {
    const errors = untrack((scope) => {
      return this._onFocus._isEmpty() ? null : this.getError(scope)
    })

    if (isNull(errors)) {
      return null
    }

    return () => {
      this._onFocus._emit(errors)
    }
  }

  // TODO add tests against _validated when cloning
  protected _childOf(
    parent: null | ImpulseForm,
  ): ImpulseFormValue<TInput, TError, TOutput> {
    return new ImpulseFormValue<TInput, TError, TOutput>(
      parent,
      this._isInputEqual,
      this._isInputDirty,
      this._initialSource.clone(),
      this._touched.clone(),
      this._validateOn.clone(),
      this._error.clone(),
      this._isExplicitInitial.clone(),
      this._initial.clone(),
      this._input.clone(),
      this._validate.clone(),
    )
  }

  protected _setInitial(
    initial: undefined | ImpulseFormValue<TInput, TError, TOutput>,
    isRoot: boolean,
  ): void {
    batch((scope) => {
      this._initialSource.setValue(initial)

      if (
        initial != null &&
        isRoot &&
        this._isExplicitInitial.getValue(scope)
      ) {
        initial.setInitial(this._initial.getValue(scope))
      }
    })
  }

  protected _setValidated(isValidated: boolean): void {
    this._validated.setValue(isValidated)
  }

  protected _isDirty<TResult>(
    scope: Scope,
    select: (concise: boolean, verbose: boolean, dirty: boolean) => TResult,
  ): TResult {
    const initial = this.getInitial(scope)
    const input = this.getInput(scope)
    const dirty = this._isInputDirty(initial, input, scope)

    return select(dirty, dirty, true)
  }

  public getError(scope: Scope): null | TError
  public getError<TResult>(
    scope: Scope,
    select: (concise: null | TError, verbose: null | TError) => TResult,
  ): TResult
  public getError<TResult>(
    scope: Scope,
    select: (
      concise: null | TError,
      verbose: null | TError,
    ) => TResult = params._first as typeof select,
  ): TResult {
    const [error] = this._transform(scope)

    return select(error, error)
  }

  public setErrors(setter: ImpulseFormValueErrorSetter<TError>): void
  public setErrors(setter: Setter<null | TError>): void {
    this._error.setValue((error) => resolveSetter(setter, error))
  }

  public isValidated(scope: Scope): boolean
  public isValidated<TResult>(
    scope: Scope,
    select: (concise: boolean, verbose: boolean) => TResult,
  ): TResult
  public isValidated<TResult>(
    scope: Scope,
    select: (
      concise: boolean,
      verbose: boolean,
    ) => TResult = params._first as typeof select,
  ): TResult {
    const validated =
      this._validated.getValue(scope) || this._error.getValue(scope) != null

    return select(validated, validated)
  }

  public getValidateOn(scope: Scope): ImpulseFormValueValidateOnSchema<TError>
  public getValidateOn<TResult>(
    scope: Scope,
    select: (
      concise: ImpulseFormValueValidateOnSchema<TError>,
      verbose: ImpulseFormValueValidateOnSchema<TError>,
    ) => TResult,
  ): TResult
  public getValidateOn<TResult>(
    scope: Scope,
    select: (
      concise: ImpulseFormValueValidateOnSchema<TError>,
      verbose: ImpulseFormValueValidateOnSchema<TError>,
    ) => TResult = params._first as typeof select,
  ): TResult {
    const validateOn = this._validateOn.getValue(
      scope,
    ) as ImpulseFormValueValidateOnSchema<TError>

    return select(validateOn, validateOn)
  }

  public setValidateOn(setter: ImpulseFormValueValidateOnSetter<TError>): void
  public setValidateOn(setter: Setter<ValidateStrategy>): void {
    batch((scope) => {
      const validateOn = this._validateOn.getValue(scope)
      const nextValidateOn = resolveSetter(setter, validateOn)

      if (validateOn !== nextValidateOn) {
        this._validateOn.setValue(nextValidateOn)
        this._updateValidated(true)
      }
    })
  }

  public isTouched(scope: Scope): boolean
  public isTouched<TResult>(
    scope: Scope,
    select: (concise: boolean, verbose: boolean) => TResult,
  ): TResult
  public isTouched<TResult>(
    scope: Scope,
    select: (
      concise: boolean,
      verbose: boolean,
    ) => TResult = params._first as typeof select,
  ): TResult {
    const touched = this._touched.getValue(scope)

    return select(touched, touched)
  }

  public setTouched(touched: ImpulseFormValueFlagSetter): void {
    batch(() => {
      this._touched.setValue(touched)
      this._updateValidated()
    })
  }

  public setSchema(
    schema: TError extends ReadonlyArray<string>
      ? ZodLikeSchema<TOutput>
      : never,
  ): void {
    this._validate.setValue(() => (input: TInput) => {
      return zodLikeParse(schema, input) as Result<TError, TOutput>
    })
  }

  public reset(
    resetter: ImpulseFormValueInputSetter<TInput> = params._first,
  ): void {
    batch((scope) => {
      const resetValue = resolveSetter(
        resetter,
        this.getInitial(scope),
        this._input.getValue(scope),
      )

      this.setInitial(resetValue)
      this.setInput(resetValue)
      // TODO test when reset for all below
      this._validated.setValue(false)
      this._touched.setValue(false)
      this._error.setValue(null)
    })
  }

  public getOutput(scope: Scope): ImpulseFormValueOutputSchema<TError, TOutput>
  public getOutput<TResult>(
    scope: Scope,
    select: (
      concise: ImpulseFormValueOutputSchema<TError, TOutput>,
      verbose: ImpulseFormValueOutputSchemaVerbose<TError, TOutput>,
    ) => TResult,
  ): TResult
  public getOutput<TResult>(
    scope: Scope,
    select: (
      concise: ImpulseFormValueOutputSchema<TError, TOutput>,
      verbose: ImpulseFormValueOutputSchemaVerbose<TError, TOutput>,
    ) => TResult = params._first as typeof select,
  ): TResult {
    const [, output] = this._transform(scope)

    return select(output!, output!)
  }

  public getInput(scope: Scope): TInput {
    return this._input.getValue(scope)
  }

  // TODO add tests against initial coming as second argument
  public setInput(setter: ImpulseFormValueInputSetter<TInput>): void {
    batch((scope) => {
      const input = this._input.getValue(scope)

      this._input.setValue(resolveSetter(setter, input, this.getInitial(scope)))

      if (input !== this._input.getValue(scope)) {
        this._updateValidated()
      }
    })
  }

  public getInitial(scope: Scope): TInput {
    const form = this._initialSource.getValue(scope) ?? this

    return form._initial.getValue(scope)
  }

  // TODO add tests against input coming as second argument
  public setInitial(setter: ImpulseFormValueInputSetter<TInput>): void {
    batch((scope) => {
      const initial = this.getInitial(scope)

      this._initial.setValue(
        resolveSetter(setter, initial, this._input.getValue(scope)),
      )

      this._isExplicitInitial.setValue(true)

      if (initial !== this._initial.getValue(scope)) {
        this._updateValidated()
        this._initialSource.getValue(scope)?.setInitial(setter)
      }
    })
  }

  public onFocusWhenInvalid(onFocus: (errors: TError) => void): VoidFunction {
    return this._onFocus._subscribe(onFocus)
  }
}
