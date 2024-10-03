import type Types from "ts-toolbelt"

import { type Scope, batch } from "./dependencies"
import {
  type ComputeObject,
  isTrue,
  type Setter,
  resolveSetter,
  params,
  isUndefined,
  isString,
  isBoolean,
  isFunction,
  isTruthy,
} from "./utils"
import {
  type GetImpulseFormParam,
  type ImpulseFormParamsKeys,
  ImpulseForm,
} from "./ImpulseForm"
import { VALIDATE_ON_TOUCH, type ValidateStrategy } from "./ValidateStrategy"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ImpulseFormShapeFields = Record<string | number, any>

type ImpulseFormShapeParam<
  TFields extends ImpulseFormShapeFields,
  TKey extends ImpulseFormParamsKeys,
  TFallback extends "field" | "nothing" = "nothing",
> = ComputeObject<
  Types.Object.Filter<
    {
      readonly [TField in Types.Any.Keys<TFields>]: GetImpulseFormParam<
        TFields[TField],
        TKey,
        TFallback extends "field" ? TFields[TField] : never
      >
    },
    never,
    "equals"
  >
>

export type ImpulseFormShapeInputSchema<
  TFields extends ImpulseFormShapeFields,
> = ImpulseFormShapeParam<TFields, "input.schema", "field">

export type ImpulseFormShapeInputSetter<
  TFields extends ImpulseFormShapeFields,
> = Setter<
  Partial<ImpulseFormShapeParam<TFields, "input.setter">>,
  [ImpulseFormShapeInputSchema<TFields>, ImpulseFormShapeInputSchema<TFields>]
>

export type ImpulseFormShapeOutputSchema<
  TFields extends ImpulseFormShapeFields,
> = ImpulseFormShapeParam<TFields, "output.schema", "field">

export type ImpulseFormShapeOutputSchemaVerbose<
  TFields extends ImpulseFormShapeFields,
> = ImpulseFormShapeParam<TFields, "output.schema.verbose", "field">

export type ImpulseFormShapeFlagSchema<TFields extends ImpulseFormShapeFields> =
  boolean | ImpulseFormShapeParam<TFields, "flag.schema">

export type ImpulseFormShapeFlagSchemaVerbose<
  TFields extends ImpulseFormShapeFields,
> = ImpulseFormShapeParam<TFields, "flag.schema.verbose">

export type ImpulseFormShapeFlagSetter<TFields extends ImpulseFormShapeFields> =
  Setter<
    boolean | Partial<ImpulseFormShapeParam<TFields, "flag.setter">>,
    [ImpulseFormShapeFlagSchemaVerbose<TFields>]
  >

export type ImpulseFormShapeValidateOnSchema<
  TFields extends ImpulseFormShapeFields,
> = ValidateStrategy | ImpulseFormShapeParam<TFields, "validateOn.schema">

export type ImpulseFormShapeValidateOnSchemaVerbose<
  TFields extends ImpulseFormShapeFields,
> = ImpulseFormShapeParam<TFields, "validateOn.schema.verbose">

export type ImpulseFormShapeValidateOnSetter<
  TFields extends ImpulseFormShapeFields,
> = Setter<
  | ValidateStrategy
  | Partial<ImpulseFormShapeParam<TFields, "validateOn.setter">>,
  [ImpulseFormShapeValidateOnSchemaVerbose<TFields>]
>

export type ImpulseFormShapeErrorSetter<
  TFields extends ImpulseFormShapeFields,
> = Setter<
  null | Partial<ImpulseFormShapeParam<TFields, "error.setter">>,
  [ImpulseFormShapeErrorSchemaVerbose<TFields>]
>

export type ImpulseFormShapeErrorSchema<
  TFields extends ImpulseFormShapeFields,
> = null | ImpulseFormShapeParam<TFields, "error.schema">

export type ImpulseFormShapeErrorSchemaVerbose<
  TFields extends ImpulseFormShapeFields,
> = ImpulseFormShapeParam<TFields, "error.schema.verbose">

export interface ImpulseFormShapeOptions<
  TFields extends ImpulseFormShapeFields,
> {
  input?: ImpulseFormShapeInputSetter<TFields>
  initial?: ImpulseFormShapeInputSetter<TFields>
  touched?: ImpulseFormShapeFlagSetter<TFields>
  validateOn?: ImpulseFormShapeValidateOnSetter<TFields>
  errors?: ImpulseFormShapeErrorSetter<TFields>
}

export class ImpulseFormShape<
  TFields extends ImpulseFormShapeFields = ImpulseFormShapeFields,
> extends ImpulseForm<{
  "input.schema": ImpulseFormShapeInputSchema<TFields>
  "input.setter": ImpulseFormShapeInputSetter<TFields>

  "output.schema": ImpulseFormShapeOutputSchema<TFields>
  "output.schema.verbose": ImpulseFormShapeOutputSchemaVerbose<TFields>

  "flag.setter": ImpulseFormShapeFlagSetter<TFields>
  "flag.schema": ImpulseFormShapeFlagSchema<TFields>
  "flag.schema.verbose": ImpulseFormShapeFlagSchemaVerbose<TFields>

  "validateOn.setter": ImpulseFormShapeValidateOnSetter<TFields>
  "validateOn.schema": ImpulseFormShapeValidateOnSchema<TFields>
  "validateOn.schema.verbose": ImpulseFormShapeValidateOnSchemaVerbose<TFields>

  "error.setter": ImpulseFormShapeErrorSetter<TFields>
  "error.schema": ImpulseFormShapeErrorSchema<TFields>
  "error.schema.verbose": ImpulseFormShapeErrorSchemaVerbose<TFields>
}> {
  public static of<TFields extends ImpulseFormShapeFields>(
    fields: Readonly<TFields>,
    {
      input,
      initial,
      touched,
      validateOn,
      errors,
    }: ImpulseFormShapeOptions<TFields> = {},
  ): ImpulseFormShape<TFields> {
    const shape = new ImpulseFormShape(null, fields)

    batch(() => {
      if (!isUndefined(touched)) {
        shape.setTouched(touched)
      }

      if (!isUndefined(initial)) {
        shape.setInitial(initial)
      }

      if (!isUndefined(input)) {
        shape.setInput(input)
      }

      if (!isUndefined(validateOn)) {
        shape.setValidateOn(validateOn)
      }

      // TODO add test against null
      if (!isUndefined(errors)) {
        shape.setErrors(errors)
      }
    })

    return shape
  }

  public readonly fields: Readonly<TFields>

  protected constructor(root: null | ImpulseForm, fields: Readonly<TFields>) {
    super(root)

    const acc = {} as TFields

    for (const [key, field] of Object.entries(fields)) {
      acc[key as keyof TFields] = ImpulseForm.isImpulseForm(field)
        ? (ImpulseForm._childOf(this, field) as TFields[keyof TFields])
        : (field as TFields[keyof TFields])
    }

    this.fields = acc
  }

  private _mapFormFields<TResult>(
    fn: (form: ImpulseForm, key: string) => TResult,
  ): Readonly<Record<keyof TFields, TResult>> {
    const acc = {} as Record<keyof TFields, TResult>

    for (const [key, field] of Object.entries(this.fields)) {
      const result = ImpulseForm.isImpulseForm(field)
        ? fn(field, key)
        : (field as TResult)

      acc[key as keyof typeof acc] = result
    }

    return acc
  }

  protected _submitWith(
    output: ImpulseFormShapeOutputSchema<TFields>,
  ): ReadonlyArray<void | Promise<unknown>> {
    const promises = Object.entries(this.fields).flatMap(([key, field]) => {
      if (!ImpulseForm.isImpulseForm(field)) {
        return []
      }

      return ImpulseForm._submitWith(field, output[key as keyof typeof output])
    })

    return [...super._submitWith(output), ...promises]
  }

  protected _getFocusFirstInvalidValue(): VoidFunction | null {
    for (const field of Object.values(this.fields)) {
      if (ImpulseForm.isImpulseForm(field)) {
        const focus = ImpulseForm._getFocusFirstInvalidValue(field)

        if (focus != null) {
          return focus
        }
      }
    }

    return null
  }

  protected _childOf(parent: null | ImpulseForm): ImpulseFormShape<TFields> {
    const fields = this._mapFormFields((form) =>
      ImpulseForm._childOf(this, form),
    )

    return new ImpulseFormShape(parent, fields as TFields[keyof TFields])
  }

  protected _setInitial(
    initial: undefined | ImpulseFormShape<TFields>,
    isRoot: boolean,
  ): void {
    for (const [key, field] of Object.entries(this.fields)) {
      if (ImpulseForm.isImpulseForm(field)) {
        ImpulseForm._setInitial(field, initial?.fields[key], isRoot)
      }
    }
  }

  protected _setValidated(isValidated: boolean): void {
    for (const field of Object.values(this.fields)) {
      if (ImpulseForm.isImpulseForm(field)) {
        ImpulseForm._setValidated(field, isValidated)
      }
    }
  }

  protected _isDirty<TResult>(
    scope: Scope,
    select: (
      concise: ImpulseFormShapeFlagSchema<TFields>,
      verbose: ImpulseFormShapeFlagSchemaVerbose<TFields>,
      dirty: ImpulseFormShapeFlagSchemaVerbose<TFields>,
    ) => TResult,
  ): TResult {
    const keys = Object.keys(this.fields)

    let isAllDirty = true
    let isNoneDirty = true
    // make it easier for TS
    const isDirtyConcise = {} as Record<string, unknown>
    const isDirtyVerbose = {} as Record<string, unknown>
    const isDirtyDirty = {} as Record<string, unknown>

    for (const key of keys) {
      const field = this.fields[key]

      if (ImpulseForm.isImpulseForm(field)) {
        const [concise, verbose, dirty] = ImpulseForm._isDirty(
          scope,
          field,
          params,
        )

        isAllDirty = isAllDirty && concise === true
        isNoneDirty = isNoneDirty && concise === false
        isDirtyConcise[key] = concise
        isDirtyVerbose[key] = verbose
        isDirtyDirty[key] = dirty
      }
    }

    return select(
      isNoneDirty
        ? false
        : isAllDirty
          ? true
          : (isDirtyConcise as unknown as ImpulseFormShapeFlagSchema<TFields>),
      isDirtyVerbose as unknown as ImpulseFormShapeFlagSchemaVerbose<TFields>,
      isDirtyDirty as unknown as ImpulseFormShapeFlagSchemaVerbose<TFields>,
    )
  }

  public getError(scope: Scope): ImpulseFormShapeErrorSchema<TFields>
  public getError<TResult>(
    scope: Scope,
    select: (
      concise: ImpulseFormShapeErrorSchema<TFields>,
      verbose: ImpulseFormShapeErrorSchemaVerbose<TFields>,
    ) => TResult,
  ): TResult
  public getError<TResult = ImpulseFormShapeErrorSchema<TFields>>(
    scope: Scope,
    select: (
      concise: ImpulseFormShapeErrorSchema<TFields>,
      verbose: ImpulseFormShapeErrorSchemaVerbose<TFields>,
    ) => TResult = params._first as typeof select,
  ): TResult {
    let errorsNone = true
    // make it easier for TS
    const errorsConcise = {} as Record<string, unknown>
    const errorsVerbose = {} as Record<string, unknown>

    for (const [key, field] of Object.entries(this.fields)) {
      if (ImpulseForm.isImpulseForm(field)) {
        const errors = field.getError(scope, (concise, verbose) => ({
          concise,
          verbose,
        }))

        errorsNone = errorsNone && errors.concise == null
        errorsConcise[key] = errors.concise
        errorsVerbose[key] = errors.verbose
      }
    }

    return select(
      errorsNone
        ? null
        : (errorsConcise as unknown as ImpulseFormShapeErrorSchema<TFields>),
      errorsVerbose as unknown as ImpulseFormShapeErrorSchemaVerbose<TFields>,
    )
  }

  public setErrors(errors: ImpulseFormShapeErrorSetter<TFields>): void {
    batch((scope) => {
      const nextErrors = isFunction(errors)
        ? errors(this.getError(scope, (_, verbose) => verbose))
        : errors

      for (const [key, field] of Object.entries(this.fields)) {
        const nextFieldTouched =
          nextErrors == null
            ? nextErrors
            : nextErrors[key as keyof typeof nextErrors]

        if (
          ImpulseForm.isImpulseForm(field) &&
          nextFieldTouched !== undefined
        ) {
          field.setErrors(nextFieldTouched)
        }
      }
    })
  }

  /**
   * @param scope
   *
   * @returns true when ALL fields are validated, otherwise false
   */
  public isValidated(scope: Scope): boolean

  public isValidated<TResult>(
    scope: Scope,
    select: (
      concise: ImpulseFormShapeFlagSchema<TFields>,
      verbose: ImpulseFormShapeFlagSchemaVerbose<TFields>,
    ) => TResult,
  ): TResult
  public isValidated<TResult = boolean>(
    scope: Scope,
    select: (
      concise: ImpulseFormShapeFlagSchema<TFields>,
      verbose: ImpulseFormShapeFlagSchemaVerbose<TFields>,
    ) => TResult = isTrue as unknown as typeof select,
  ): TResult {
    let validatedAll = true
    let validatedNone = true
    // make it easier for TS
    const validatedConcise = {} as Record<string, unknown>
    const validatedVerbose = {} as Record<string, unknown>

    for (const [key, field] of Object.entries(this.fields)) {
      if (ImpulseForm.isImpulseForm(field)) {
        const validated = field.isValidated(scope, (concise, verbose) => ({
          concise,
          verbose,
        }))

        validatedAll = validatedAll && validated.concise === true
        validatedNone = validatedNone && validated.concise === false
        validatedConcise[key] = validated.concise
        validatedVerbose[key] = validated.verbose
      }
    }

    return select(
      validatedNone
        ? false
        : validatedAll
          ? true
          : (validatedConcise as unknown as ImpulseFormShapeFlagSchema<TFields>),
      validatedVerbose as unknown as ImpulseFormShapeFlagSchemaVerbose<TFields>,
    )
  }

  public getValidateOn(scope: Scope): ImpulseFormShapeValidateOnSchema<TFields>
  public getValidateOn<TResult>(
    scope: Scope,
    select: (
      concise: ImpulseFormShapeValidateOnSchema<TFields>,
      verbose: ImpulseFormShapeValidateOnSchemaVerbose<TFields>,
    ) => TResult,
  ): TResult
  public getValidateOn<TResult = ImpulseFormShapeValidateOnSchema<TFields>>(
    scope: Scope,
    select: (
      concise: ImpulseFormShapeValidateOnSchema<TFields>,
      verbose: ImpulseFormShapeValidateOnSchemaVerbose<TFields>,
    ) => TResult = params._first as typeof select,
  ): TResult {
    // make it easier for TS
    const validateOnConcise = {} as Record<string, unknown>
    const validateOnVerbose = {} as Record<string, unknown>

    for (const [key, field] of Object.entries(this.fields)) {
      if (ImpulseForm.isImpulseForm(field)) {
        const validateOn = field.getValidateOn(scope, (concise, verbose) => ({
          concise,
          verbose,
        }))

        validateOnConcise[key] = validateOn.concise
        validateOnVerbose[key] = validateOn.verbose
      }
    }

    const validateOnConciseValues = Object.values(validateOnConcise)

    return select(
      validateOnConciseValues.length === 0
        ? // defaults to "onTouch"
          VALIDATE_ON_TOUCH
        : validateOnConciseValues.every(isString) &&
            new Set(validateOnConciseValues).size === 1
          ? (validateOnConciseValues[0] as ValidateStrategy)
          : (validateOnConcise as unknown as ImpulseFormShapeValidateOnSchema<TFields>),
      validateOnVerbose as unknown as ImpulseFormShapeValidateOnSchemaVerbose<TFields>,
    )
  }

  public setValidateOn(
    validateOn: ImpulseFormShapeValidateOnSetter<TFields>,
  ): void {
    batch((scope) => {
      const nextValidateOn = isFunction(validateOn)
        ? validateOn(this.getValidateOn(scope, (_, verbose) => verbose))
        : validateOn

      for (const [key, field] of Object.entries(this.fields)) {
        const nextFieldTouched = isString(nextValidateOn)
          ? nextValidateOn
          : nextValidateOn[key as keyof typeof nextValidateOn]

        if (
          ImpulseForm.isImpulseForm(field) &&
          !isUndefined(nextFieldTouched)
        ) {
          field.setValidateOn(nextFieldTouched)
        }
      }
    })
  }

  public isTouched(scope: Scope): boolean
  public isTouched<TResult>(
    scope: Scope,
    select: (
      concise: ImpulseFormShapeFlagSchema<TFields>,
      verbose: ImpulseFormShapeFlagSchemaVerbose<TFields>,
    ) => TResult,
  ): TResult
  public isTouched<TResult = boolean>(
    scope: Scope,
    select: (
      concise: ImpulseFormShapeFlagSchema<TFields>,
      verbose: ImpulseFormShapeFlagSchemaVerbose<TFields>,
    ) => TResult = isTruthy as unknown as typeof select,
  ): TResult {
    let touchedAll = true
    let touchedNone = true
    // make it easier for TS
    const touchedConcise = {} as Record<string, unknown>
    const touchedVerbose = {} as Record<string, unknown>

    for (const [key, field] of Object.entries(this.fields)) {
      if (ImpulseForm.isImpulseForm(field)) {
        const touched = field.isTouched(scope, (concise, verbose) => ({
          concise,
          verbose,
        }))

        touchedAll = touchedAll && touched.concise === true
        touchedNone = touchedNone && touched.concise === false
        touchedConcise[key] = touched.concise
        touchedVerbose[key] = touched.verbose
      }
    }

    return select(
      touchedNone
        ? false
        : touchedAll
          ? true
          : (touchedConcise as unknown as ImpulseFormShapeFlagSchema<TFields>),
      touchedVerbose as unknown as ImpulseFormShapeFlagSchemaVerbose<TFields>,
    )
  }

  public setTouched(touched: ImpulseFormShapeFlagSetter<TFields>): void {
    batch((scope) => {
      const nextTouched = isFunction(touched)
        ? touched(this.isTouched(scope, (_, verbose) => verbose))
        : touched

      for (const [key, field] of Object.entries(this.fields)) {
        const nextFieldTouched = isBoolean(nextTouched)
          ? nextTouched
          : nextTouched[key as keyof typeof nextTouched]

        if (
          ImpulseForm.isImpulseForm(field) &&
          nextFieldTouched !== undefined
        ) {
          field.setTouched(nextFieldTouched)
        }
      }
    })
  }

  public reset(
    resetter: ImpulseFormShapeInputSetter<TFields> = params._first as typeof resetter,
  ): void {
    batch((scope) => {
      const resetValue = isFunction(resetter)
        ? resetter(this.getInitial(scope), this.getInput(scope))
        : resetter

      for (const [key, field] of Object.entries(this.fields)) {
        if (ImpulseForm.isImpulseForm(field)) {
          field.reset(resetValue[key as keyof typeof resetValue])
        }
      }
    })
  }

  public getOutput(scope: Scope): null | ImpulseFormShapeOutputSchema<TFields>
  public getOutput<TResult>(
    scope: Scope,
    select: (
      concise: null | ImpulseFormShapeOutputSchema<TFields>,
      verbose: ImpulseFormShapeOutputSchemaVerbose<TFields>,
    ) => TResult,
  ): TResult
  public getOutput<TResult = null | ImpulseFormShapeOutputSchema<TFields>>(
    scope: Scope,
    select: (
      concise: null | ImpulseFormShapeOutputSchema<TFields>,
      verbose: ImpulseFormShapeOutputSchemaVerbose<TFields>,
    ) => TResult = params._first as typeof select,
  ): TResult {
    let allValid = true
    // make it easier for TS
    const valueConcise = {} as Record<string, unknown>
    const valueVerbose = {} as Record<string, unknown>

    for (const [key, field] of Object.entries(this.fields)) {
      if (ImpulseForm.isImpulseForm(field)) {
        const output = field.getOutput(scope, (concise, verbose) => ({
          concise,
          verbose,
        }))

        allValid = allValid && output.concise !== null
        valueConcise[key] = output.concise
        valueVerbose[key] = output.verbose
      } else {
        valueConcise[key] = field
        valueVerbose[key] = field
      }
    }

    return select(
      allValid
        ? (valueConcise as unknown as ImpulseFormShapeOutputSchema<TFields>)
        : null,
      valueVerbose as unknown as ImpulseFormShapeOutputSchemaVerbose<TFields>,
    )
  }

  public getInput(scope: Scope): ImpulseFormShapeInputSchema<TFields> {
    const input = this._mapFormFields((form) => form.getInput(scope))

    return input as unknown as ImpulseFormShapeInputSchema<TFields>
  }

  // TODO add tests against initial coming as second argument
  public setInput(setter: ImpulseFormShapeInputSetter<TFields>): void {
    batch((scope) => {
      const nextInput = resolveSetter(
        setter,
        this.getInput(scope),
        this.getInitial(scope),
      )

      for (const [key, field] of Object.entries(this.fields)) {
        const nextFieldInput = nextInput[key as keyof typeof nextInput]

        if (ImpulseForm.isImpulseForm(field) && nextFieldInput !== undefined) {
          field.setInput(nextFieldInput)
        }
      }
    })
  }

  public getInitial(scope: Scope): ImpulseFormShapeInputSchema<TFields> {
    const initial = this._mapFormFields((form) => form.getInitial(scope))

    return initial as unknown as ImpulseFormShapeInputSchema<TFields>
  }

  // TODO add tests against input coming as second argument
  public setInitial(setter: ImpulseFormShapeInputSetter<TFields>): void {
    batch((scope) => {
      const nextInitial = resolveSetter(
        setter,
        this.getInitial(scope),
        this.getInput(scope),
      )

      for (const [key, field] of Object.entries(this.fields)) {
        const nextFieldInitial = nextInitial[key as keyof typeof nextInitial]

        if (
          ImpulseForm.isImpulseForm(field) &&
          nextFieldInitial !== undefined
        ) {
          field.setInitial(nextFieldInitial)
        }
      }
    })
  }
}
