/**
 * A context to track Impulse#getValue usage inside the watcher function.
 * The tracked calls will subscribe related stores to updates,
 * so the watcher will execute on each update.
 *
 * @private
 */
export class ImpulseEmitter {
  private static queue: null | Array<null | ReadonlySet<ImpulseEmitter>> = null

  public static schedule(
    execute: () => null | ReadonlySet<ImpulseEmitter>,
  ): void {
    if (this.queue == null) {
      this.queue = []

      this.queue.push(execute())

      const uniq = new WeakSet<ImpulseEmitter>()

      this.queue.forEach((emitters) => {
        emitters?.forEach((emitter) => {
          if (!uniq.has(emitter)) {
            uniq.add(emitter)
            emitter.increment()
            emitter.emit?.()
          }
        })
      })

      this.queue = null
    } else {
      this.queue.push(execute())
    }
  }

  private readonly cleanups: Array<VoidFunction> = []

  private version = 0

  private emit: null | VoidFunction = null

  private increment(): void {
    this.version = (this.version + 1) % 10e9
    this.detach()
  }

  public detach(): void {
    this.cleanups.forEach((cleanup) => cleanup())
    this.cleanups.length = 0
  }

  public attach(cleanup: VoidFunction): void {
    this.cleanups.push(cleanup)
  }

  public onEmit = (emit: VoidFunction): VoidFunction => {
    this.emit = emit

    return () => {
      this.increment()
      this.emit = null
    }
  }

  public getVersion = (): number => {
    return this.version
  }
}
