import type { Directive, DirectiveBinding } from '@vue/runtime-core'

interface ClickOutsideElement extends HTMLElement {
  _clickOutsideHandler?: (event: Event) => void
}

interface ClickOutsideBinding {
  handler: (event: Event) => void
  exclude?: string[] | HTMLElement[]
  detectIframe?: boolean
}

function setupClickOutside(el: ClickOutsideElement, binding: DirectiveBinding<ClickOutsideBinding | Function>) {
  const { value } = binding
  
  if (!value) {
    if (__DEV__) {
      console.warn('[v-click-outside] No handler provided')
    }
    return
  }

  const config = typeof value === 'function' 
    ? { handler: value, exclude: [], detectIframe: false }
    : { exclude: [], detectIframe: false, ...value }

  const { handler, exclude = [], detectIframe = false } = config

  if (typeof handler !== 'function') {
    if (__DEV__) {
      console.warn('[v-click-outside] Handler must be a function')
    }
    return
  }

  const clickHandler = (event: Event) => {
    const target = event.target as Node

    // Check if click is inside the element
    if (el.contains(target)) {
      return
    }

    // Check excluded elements
    const isExcluded = exclude.some(item => {
      if (typeof item === 'string') {
        const excludedEl = document.querySelector(item)
        return excludedEl && excludedEl.contains(target)
      } else if (item instanceof HTMLElement) {
        return item.contains(target)
      }
      return false
    })

    if (isExcluded) {
      return
    }

    // Call the handler
    handler(event)
  }

  // Store handler for cleanup
  el._clickOutsideHandler = clickHandler

  // Add event listeners
  document.addEventListener('click', clickHandler, true)
  document.addEventListener('touchstart', clickHandler, true)

  // Detect iframe clicks if enabled
  if (detectIframe) {
    const iframeHandler = () => {
      // Create a synthetic event for iframe clicks
      const syntheticEvent = new Event('click', { bubbles: true })
      Object.defineProperty(syntheticEvent, 'target', {
        value: document.body,
        enumerable: true
      })
      handler(syntheticEvent)
    }

    // Listen for blur events which can indicate iframe interaction
    window.addEventListener('blur', iframeHandler)
    
    // Store iframe handler for cleanup
    ;(el as any)._iframeHandler = iframeHandler
  }
}

function cleanupClickOutside(el: ClickOutsideElement) {
  if (el._clickOutsideHandler) {
    document.removeEventListener('click', el._clickOutsideHandler, true)
    document.removeEventListener('touchstart', el._clickOutsideHandler, true)
    delete el._clickOutsideHandler
  }

  const iframeHandler = (el as any)._iframeHandler
  if (iframeHandler) {
    window.removeEventListener('blur', iframeHandler)
    delete (el as any)._iframeHandler
  }
}

/**
 * v-click-outside directive
 * Detects clicks outside of the element and calls the provided handler
 * 
 * @example
 * ```html
 * <!-- Basic usage -->
 * <div v-click-outside="closeDropdown">Dropdown content</div>
 * 
 * <!-- With options -->
 * <div v-click-outside="{ 
 *   handler: closeDropdown, 
 *   exclude: ['.ignore-element'],
 *   detectIframe: true 
 * }">
 *   Modal content
 * </div>
 * ```
 */
export const vClickOutside: Directive<ClickOutsideElement, ClickOutsideBinding | Function> = {
  mounted(el, binding) {
    setupClickOutside(el, binding)
  },

  updated(el, binding) {
    // Remove old listeners and add new ones
    cleanupClickOutside(el)
    setupClickOutside(el, binding)
  },

  unmounted(el) {
    cleanupClickOutside(el)
  }
} 