import { ref, watch, computed, type Ref, type ComputedRef } from '@vue/reactivity'

export interface DebugEntry<T> {
  value: T
  timestamp: number
  stack?: string
}

export interface UseDebugValueOptions {
  maxHistory?: number
  trackStack?: boolean
  label?: string
}

export interface UseDebugValueReturn<T> {
  value: Ref<T>
  history: ComputedRef<DebugEntry<T>[]>
  clear: () => void
  getStats: () => {
    changeCount: number
    firstChange: number | null
    lastChange: number | null
    averageInterval: number | null
  }
}

/**
 * Enhanced debugging for reactive values with history tracking
 * 
 * @param initialValue - Initial value to track
 * @param options - Debug configuration options
 * @returns Object with reactive value and debugging utilities
 * 
 * @example
 * ```js
 * const { value: count, history, getStats } = useDebugValue(0, { 
 *   label: 'Counter',
 *   maxHistory: 50 
 * })
 * 
 * count.value = 1 // tracked in history
 * console.log(history.value) // see all changes
 * console.log(getStats()) // get change statistics
 * ```
 */
export function useDebugValue<T>(
  initialValue: T,
  options: UseDebugValueOptions = {}
): UseDebugValueReturn<T> {
  const { maxHistory = 100, trackStack = __DEV__, label } = options
  
  const value = ref(initialValue) as Ref<T>
  const historyEntries = ref<DebugEntry<T>[]>([]) as Ref<DebugEntry<T>[]>
  
  // Add initial entry
  historyEntries.value.push({
    value: initialValue,
    timestamp: Date.now(),
    stack: trackStack ? new Error().stack : undefined
  })

  // Watch for changes and track history
  watch(
    value,
    (newValue) => {
      const entry: DebugEntry<T> = {
        value: newValue,
        timestamp: Date.now(),
        stack: trackStack ? new Error().stack : undefined
      }
      
      historyEntries.value.push(entry)
      
      // Limit history size
      if (historyEntries.value.length > maxHistory) {
        historyEntries.value.shift()
      }
      
      // Log in development
      if (__DEV__ && label) {
        console.log(`[${label}] Value changed:`, newValue, entry)
      }
    },
    { deep: true }
  )

  const history = computed(() => historyEntries.value)

  const clear = (): void => {
    historyEntries.value = [{
      value: value.value,
      timestamp: Date.now(),
      stack: trackStack ? new Error().stack : undefined
    }]
  }

  const getStats = () => {
    const entries = historyEntries.value
    const changeCount = entries.length - 1 // Exclude initial value
    
    if (changeCount === 0) {
      return {
        changeCount: 0,
        firstChange: null,
        lastChange: null,
        averageInterval: null
      }
    }
    
    const firstChange = entries[1]?.timestamp || null
    const lastChange = entries[entries.length - 1]?.timestamp || null
    
    let averageInterval: number | null = null
    if (changeCount > 1 && firstChange && lastChange) {
      averageInterval = (lastChange - firstChange) / (changeCount - 1)
    }
    
    return {
      changeCount,
      firstChange,
      lastChange,
      averageInterval
    }
  }

  return {
    value,
    history,
    clear,
    getStats
  }
} 