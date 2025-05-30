import { useToggle } from '../../src/helpers/useToggle'
import { nextTick } from '@vue/runtime-test'

describe('useToggle', () => {
  test('should initialize with default value false', () => {
    const { value, toggle } = useToggle()
    expect(value.value).toBe(false)
  })

  test('should initialize with provided value', () => {
    const { value, toggle } = useToggle(true)
    expect(value.value).toBe(true)
  })

  test('should toggle value when called without arguments', () => {
    const { value, toggle } = useToggle(false)
    
    toggle()
    expect(value.value).toBe(true)
    
    toggle()
    expect(value.value).toBe(false)
  })

  test('should set specific value when called with argument', () => {
    const { value, toggle } = useToggle(false)
    
    toggle(true)
    expect(value.value).toBe(true)
    
    toggle(false)
    expect(value.value).toBe(false)
    
    toggle(true)
    expect(value.value).toBe(true)
  })

  test('should work with truthy/falsy values', () => {
    const { value, toggle } = useToggle('initial')
    expect(value.value).toBe('initial')
    
    toggle()
    expect(value.value).toBe(false)
    
    toggle('new value')
    expect(value.value).toBe('new value')
  })

  test('should be reactive', async () => {
    const { value, toggle } = useToggle(false)
    let reactiveValue = value.value
    
    // Simple reactivity test
    toggle(true)
    await nextTick()
    expect(value.value).toBe(true)
    
    toggle()
    await nextTick()
    expect(value.value).toBe(false)
  })
}) 