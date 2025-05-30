import { ref, computed, type Ref, type ComputedRef } from '@vue/reactivity'
import { onMounted, onUnmounted } from '../apiLifecycle'
import { getCurrentInstance } from '../component'

export interface PerformanceEntry {
  name: string
  startTime: number
  endTime: number
  duration: number
  metadata?: Record<string, any>
}

export interface PerformanceStats {
  totalCalls: number
  totalDuration: number
  averageDuration: number
  minDuration: number
  maxDuration: number
  lastDuration: number
}

export interface UsePerformanceMonitorReturn {
  entries: ComputedRef<PerformanceEntry[]>
  stats: ComputedRef<Record<string, PerformanceStats>>
  measure: (name: string, fn: () => any, metadata?: Record<string, any>) => any
  measureAsync: (name: string, fn: () => Promise<any>, metadata?: Record<string, any>) => Promise<any>
  mark: (name: string) => void
  markEnd: (name: string, metadata?: Record<string, any>) => number | null
  clear: (name?: string) => void
  export: () => PerformanceEntry[]
}

/**
 * Performance monitoring composable for Vue components
 * 
 * @param options - Configuration options
 * @returns Performance monitoring utilities
 * 
 * @example
 * ```js
 * const { measure, measureAsync, stats, entries } = usePerformanceMonitor()
 * 
 * // Measure synchronous operations
 * const result = measure('computation', () => {
 *   return heavyComputation()
 * })
 * 
 * // Measure async operations
 * const data = await measureAsync('api-call', async () => {
 *   return await fetchData()
 * })
 * 
 * // Manual timing
 * mark('custom-operation')
 * doSomething()
 * markEnd('custom-operation')
 * 
 * console.log(stats.value) // View performance statistics
 * ```
 */
export function usePerformanceMonitor(options: {
  maxEntries?: number
  autoExport?: boolean
  componentName?: string
} = {}): UsePerformanceMonitorReturn {
  const { maxEntries = 1000, autoExport = false, componentName } = options
  
  const performanceEntries = ref<PerformanceEntry[]>([])
  const activeMarks = ref<Map<string, number>>(new Map())
  
  const instance = getCurrentInstance()
  const prefix = componentName || instance?.type.name || 'unknown'

  const entries = computed(() => performanceEntries.value)

  const stats = computed(() => {
    const statsMap: Record<string, PerformanceStats> = {}
    
    performanceEntries.value.forEach((entry: PerformanceEntry) => {
      if (!statsMap[entry.name]) {
        statsMap[entry.name] = {
          totalCalls: 0,
          totalDuration: 0,
          averageDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          lastDuration: 0
        }
      }
      
      const stat = statsMap[entry.name]
      stat.totalCalls++
      stat.totalDuration += entry.duration
      stat.averageDuration = stat.totalDuration / stat.totalCalls
      stat.minDuration = Math.min(stat.minDuration, entry.duration)
      stat.maxDuration = Math.max(stat.maxDuration, entry.duration)
      stat.lastDuration = entry.duration
    })
    
    return statsMap
  })

  const addEntry = (entry: PerformanceEntry) => {
    performanceEntries.value.push(entry)
    
    // Limit entries to prevent memory leaks
    if (performanceEntries.value.length > maxEntries) {
      performanceEntries.value.shift()
    }
    
    if (__DEV__) {
      console.log(`[${prefix}] Performance: ${entry.name} took ${entry.duration.toFixed(2)}ms`)
    }
  }

  const measure = <T>(name: string, fn: () => T, metadata?: Record<string, any>): T => {
    const startTime = performance.now()
    const result = fn()
    const endTime = performance.now()
    
    addEntry({
      name: `${prefix}.${name}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata
    })
    
    return result
  }

  const measureAsync = async <T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now()
    const result = await fn()
    const endTime = performance.now()
    
    addEntry({
      name: `${prefix}.${name}`,
      startTime,
      endTime,
      duration: endTime - startTime,
      metadata
    })
    
    return result
  }

  const mark = (name: string): void => {
    const fullName = `${prefix}.${name}`
    activeMarks.value.set(fullName, performance.now())
  }

  const markEnd = (name: string, metadata?: Record<string, any>): number | null => {
    const fullName = `${prefix}.${name}`
    const startTime = activeMarks.value.get(fullName)
    
    if (startTime === undefined) {
      if (__DEV__) {
        console.warn(`[${prefix}] No start mark found for: ${name}`)
      }
      return null
    }
    
    const endTime = performance.now()
    const duration = endTime - startTime
    
    addEntry({
      name: fullName,
      startTime,
      endTime,
      duration,
      metadata
    })
    
    activeMarks.value.delete(fullName)
    return duration
  }

  const clear = (name?: string): void => {
    if (name) {
      const fullName = `${prefix}.${name}`
      performanceEntries.value = performanceEntries.value.filter(
        (entry: PerformanceEntry) => entry.name !== fullName
      )
      activeMarks.value.delete(fullName)
    } else {
      performanceEntries.value = []
      activeMarks.value.clear()
    }
  }

  const exportEntries = (): PerformanceEntry[] => {
    return [...performanceEntries.value]
  }

  // Auto-export on unmount if enabled
  if (autoExport) {
    onUnmounted(() => {
      if (__DEV__) {
        console.table(exportEntries())
        console.table(stats.value)
      }
    })
  }

  return {
    entries,
    stats,
    measure,
    measureAsync,
    mark,
    markEnd,
    clear,
    export: exportEntries
  }
} 