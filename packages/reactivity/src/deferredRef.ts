import { ref, type Ref } from './ref'
import { ReactiveFlags } from './constants'
import { Dep } from './dep'
import { hasChanged } from '@vue/shared'
import { toReactive, isShallow, isReadonly, toRaw } from './reactive'

export interface DeferredRefOptions {
  delay?: number
  maxWait?: number
}

/**
 * @internal
 */
class DeferredRefImpl<T = any> {
  _value: T
  private _rawValue: T
  private _pendingValue: T

  dep: Dep = new Dep()

  public readonly [ReactiveFlags.IS_REF] = true
  public readonly [ReactiveFlags.IS_SHALLOW]: boolean = false

  private timeoutId: number | null = null
  private maxWaitTimeoutId: number | null = null
  private firstUpdateTime: number | null = null
  private delay: number
  private maxWait: number

  constructor(value: T, options: DeferredRefOptions = {}) {
    const { delay = 0, maxWait = 0 } = options
    this.delay = delay
    this.maxWait = maxWait
    
    this._rawValue = toRaw(value)
    this._value = toReactive(value)
    this._pendingValue = value
  }

  get value() {
    if (__DEV__) {
      this.dep.track({
        target: this,
        type: 'get' as any,
        key: 'value',
      })
    } else {
      this.dep.track()
    }
    return this._value
  }

  set value(newValue) {
    this._pendingValue = newValue
    this.scheduleUpdate()
  }

  private flushUpdate() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    if (this.maxWaitTimeoutId) {
      clearTimeout(this.maxWaitTimeoutId)
      this.maxWaitTimeoutId = null
    }
    
    const oldValue = this._rawValue
    const useDirectValue =
      this[ReactiveFlags.IS_SHALLOW] ||
      isShallow(this._pendingValue) ||
      isReadonly(this._pendingValue)
    const newValue = useDirectValue ? this._pendingValue : toRaw(this._pendingValue)
    
    if (hasChanged(newValue, oldValue)) {
      this._rawValue = newValue
      this._value = useDirectValue ? newValue : toReactive(newValue)
      if (__DEV__) {
        this.dep.trigger({
          target: this,
          type: 'set' as any,
          key: 'value',
          newValue,
          oldValue,
        })
      } else {
        this.dep.trigger()
      }
    }
    
    this.firstUpdateTime = null
  }

  private scheduleUpdate() {
    // Clear existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    
    // Set up max wait timeout if not already set
    if (this.maxWait > 0 && !this.maxWaitTimeoutId && !this.firstUpdateTime) {
      this.firstUpdateTime = Date.now()
      this.maxWaitTimeoutId = setTimeout(() => this.flushUpdate(), this.maxWait) as any
    }
    
    // Schedule the delayed update
    if (this.delay > 0) {
      this.timeoutId = setTimeout(() => this.flushUpdate(), this.delay) as any
    } else {
      // If no delay, update immediately but still respect maxWait
      if (!this.maxWaitTimeoutId) {
        this.flushUpdate()
      }
    }
  }
}

/**
 * Creates a ref with deferred reactivity updates
 * Useful for performance optimization when dealing with high-frequency updates
 * 
 * @param value - Initial value
 * @param options - Configuration options
 * @returns Deferred reactive reference
 * 
 * @example
 * ```js
 * const deferredValue = deferredRef('', { delay: 300 })
 * 
 * // Updates are batched and delayed
 * deferredValue.value = 'a'
 * deferredValue.value = 'ab'
 * deferredValue.value = 'abc' // Only this final value triggers effects after 300ms
 * ```
 */
export function deferredRef<T>(
  value: T,
  options: DeferredRefOptions = {}
): Ref<T> {
  return new DeferredRefImpl(value, options) as any
}

/**
 * Creates a throttled ref that limits update frequency
 * 
 * @param value - Initial value
 * @param delay - Minimum delay between updates in milliseconds
 * @returns Throttled reactive reference
 */
export function throttledRef<T>(value: T, delay: number): Ref<T> {
  return deferredRef(value, { delay, maxWait: delay })
}

/**
 * Creates a debounced ref that delays updates until after a period of inactivity
 * 
 * @param value - Initial value
 * @param delay - Delay in milliseconds to wait for inactivity
 * @returns Debounced reactive reference
 */
export function debouncedRef<T>(value: T, delay: number): Ref<T> {
  return deferredRef(value, { delay })
} 