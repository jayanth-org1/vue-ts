import { ref, type Ref } from '@vue/reactivity'

export interface UseToggleReturn {
  value: Ref<boolean>
  toggle: (value?: boolean) => boolean
  setTrue: () => boolean
  setFalse: () => boolean
}

/**
 * Reactive boolean state with toggle functionality
 * 
 * @param initialValue - Initial boolean value (default: false)
 * @returns Object with reactive value and toggle methods
 * 
 * @example
 * ```js
 * const { value: isVisible, toggle, setTrue, setFalse } = useToggle()
 * 
 * toggle() // toggles the value
 * toggle(true) // sets to true
 * setTrue() // sets to true
 * setFalse() // sets to false
 * ```
 */
export function useToggle(initialValue = false): UseToggleReturn {
  const value = ref(initialValue)

  const toggle = (val?: boolean): boolean => {
    value.value = typeof val === 'boolean' ? val : !value.value
    return value.value
  }

  const setTrue = (): boolean => {
    value.value = true
    return true
  }

  const setFalse = (): boolean => {
    value.value = false
    return false
  }

  return {
    value,
    toggle,
    setTrue,
    setFalse
  }
} 