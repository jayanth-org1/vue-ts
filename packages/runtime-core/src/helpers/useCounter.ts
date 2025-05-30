import { ref, computed, type Ref, type ComputedRef } from '@vue/reactivity'

export interface UseCounterOptions {
  min?: number
  max?: number
  step?: number
}

export interface UseCounterReturn {
  count: Ref<number>
  inc: (delta?: number) => number
  dec: (delta?: number) => number
  get: () => number
  set: (value: number) => number
  reset: (value?: number) => number
  isMin: ComputedRef<boolean>
  isMax: ComputedRef<boolean>
}

/**
 * Reactive counter with increment, decrement, and boundary controls
 * 
 * @param initialValue - Initial counter value (default: 0)
 * @param options - Counter options with min, max, and step
 * @returns Object with reactive count and control methods
 * 
 * @example
 * ```js
 * const { count, inc, dec, reset, isMin, isMax } = useCounter(0, { min: 0, max: 10 })
 * 
 * inc() // increment by 1
 * inc(5) // increment by 5
 * dec() // decrement by 1
 * reset() // reset to initial value
 * ```
 */
export function useCounter(
  initialValue = 0,
  options: UseCounterOptions = {}
): UseCounterReturn {
  const { min = -Infinity, max = Infinity, step = 1 } = options
  
  const count = ref(Math.max(min, Math.min(max, initialValue)))

  const inc = (delta = step): number => {
    count.value = Math.min(max, count.value + delta)
    return count.value
  }

  const dec = (delta = step): number => {
    count.value = Math.max(min, count.value - delta)
    return count.value
  }

  const get = (): number => count.value

  const set = (value: number): number => {
    count.value = Math.max(min, Math.min(max, value))
    return count.value
  }

  const reset = (value = initialValue): number => {
    count.value = Math.max(min, Math.min(max, value))
    return count.value
  }

  const isMin = computed(() => count.value <= min)
  const isMax = computed(() => count.value >= max)

  return {
    count,
    inc,
    dec,
    get,
    set,
    reset,
    isMin,
    isMax
  }
} 