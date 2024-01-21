import { Impulse, type Scope } from "./dependencies"
import { isDefined } from "./utils"
import type { ImpulseFormContext } from "./ImpulseFormContext"

export interface ImpulseFormParams {
  "value.schema": unknown
  "value.schema.verbose": unknown

  "originalValue.setter": unknown
  "originalValue.resetter": unknown
  "originalValue.schema": unknown

  "flag.setter": unknown
  "flag.schema": unknown
  "flag.schema.verbose": unknown

  "errors.setter": unknown
  "errors.schema": unknown
  "errors.schema.verbose": unknown
}

export type ImpulseFormParamsKeys = keyof ImpulseFormParams

export type GetImpulseFormParam<
  TTarget,
  TKey extends ImpulseFormParamsKeys,
  TFallback = never,
> = TTarget extends ImpulseForm<infer TParams> ? TParams[TKey] : TFallback

export abstract class ImpulseForm<
  TParams extends ImpulseFormParams = ImpulseFormParams,
> {
  public static isImpulseForm(value: unknown): value is ImpulseForm {
    return value instanceof ImpulseForm
  }

  /**
   * @private
   */
  protected static _setParent(form: ImpulseForm, parent: ImpulseForm): void {
    form._parent.setValue((current) => {
      if (isDefined(current)) {
        throw new Error("ImpulseForm already has a parent")
      }

      return parent
    })
  }

  // necessary for type inference
  protected readonly _params?: TParams
  private readonly _parent = Impulse.of<ImpulseForm>()
  protected readonly _context = Impulse.of<ImpulseFormContext>()

  /**
   * @private
   */
  public _getContext(scope: Scope): undefined | ImpulseFormContext {
    return this._context.getValue(scope)
  }

  /**
   * @private
   */
  public abstract _setContext(context: ImpulseFormContext): void

  public isValid(scope: Scope): boolean {
    return !this.isInvalid(scope)
  }

  public isInvalid(scope: Scope): boolean {
    return this.getErrors(scope, isDefined)
  }

  public abstract getErrors(scope: Scope): TParams["errors.schema"]
  public abstract getErrors<TResult>(
    scope: Scope,
    select: (
      concise: TParams["errors.schema"],
      verbose: TParams["errors.schema.verbose"],
    ) => TResult,
  ): TResult

  public abstract setErrors(setter: TParams["errors.setter"]): void

  public abstract isTouched(scope: Scope): boolean
  public abstract isTouched<TResult>(
    scope: Scope,
    select: (
      concise: TParams["flag.schema"],
      verbose: TParams["flag.schema.verbose"],
    ) => TResult,
  ): TResult

  public abstract setTouched(setter: TParams["flag.setter"]): void

  public abstract reset(resetter?: TParams["originalValue.resetter"]): void

  public abstract isDirty(scope: Scope): boolean
  public abstract isDirty<TResult>(
    scope: Scope,
    select: (
      concise: TParams["flag.schema"],
      verbose: TParams["flag.schema.verbose"],
    ) => TResult,
  ): TResult

  public abstract getValue(scope: Scope): null | TParams["value.schema"]
  public abstract getValue<TResult>(
    scope: Scope,
    select: (
      concise: null | TParams["value.schema"],
      verbose: TParams["value.schema.verbose"],
    ) => TResult,
  ): TResult

  public abstract getOriginalValue(
    scope: Scope,
  ): TParams["originalValue.schema"]
  public abstract setOriginalValue(
    setter: TParams["originalValue.setter"],
  ): void

  public abstract getInitialValue(scope: Scope): TParams["originalValue.schema"]
  public abstract setInitialValue(setter: TParams["originalValue.setter"]): void

  /**
   * @private
   */
  public abstract _getFocusFirstInvalidValue(scope: Scope): null | VoidFunction
  public abstract clone(): ImpulseForm<TParams>
}
