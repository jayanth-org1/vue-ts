import { ref, watch, type Ref } from '@vue/reactivity'

export interface UseLocalStorageOptions<T> {
  defaultValue?: T
  serializer?: {
    read: (value: string) => T
    write: (value: T) => string
  }
  onError?: (error: Error) => void
}

// Simple client-side detection
const isClient = typeof window !== 'undefined'

/**
 * Reactive localStorage with automatic serialization
 * 
 * @param key - localStorage key
 * @param defaultValue - Default value when key doesn't exist
 * @param options - Configuration options
 * @returns Reactive ref synced with localStorage
 * 
 * @example
 * ```js
 * const name = useLocalStorage('user-name', 'Anonymous')
 * const settings = useLocalStorage('app-settings', { theme: 'dark' })
 * 
 * name.value = 'John' // automatically saved to localStorage
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options: UseLocalStorageOptions<T> = {}
): Ref<T> {
  const {
    serializer = {
      read: JSON.parse,
      write: JSON.stringify
    },
    onError = (e) => {
      if (__DEV__) {
        console.error(`[useLocalStorage] Error:`, e)
      }
    }
  } = options

  const storedValue = ref(defaultValue) as Ref<T>

  // Read from localStorage on initialization
  if (isClient) {
    try {
      const item = localStorage.getItem(key)
      if (item !== null) {
        storedValue.value = serializer.read(item)
      }
    } catch (error) {
      onError(error as Error)
    }
  }

  // Watch for changes and update localStorage
  if (isClient) {
    watch(
      storedValue,
      (newValue) => {
        try {
          if (newValue === null || newValue === undefined) {
            localStorage.removeItem(key)
          } else {
            localStorage.setItem(key, serializer.write(newValue))
          }
        } catch (error) {
          onError(error as Error)
        }
      },
      { deep: true }
    )

    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          storedValue.value = serializer.read(e.newValue)
        } catch (error) {
          onError(error as Error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
  }

  return storedValue
} 