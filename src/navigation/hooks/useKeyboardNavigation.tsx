/**
 * Keyboard Navigation Hook
 * Provides keyboard shortcuts and navigation support
 */

import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ROUTES } from '../routes'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
}

interface UseKeyboardNavigationOptions {
  enabled?: boolean
  shortcuts?: KeyboardShortcut[]
}

/**
 * Hook for keyboard navigation support
 */
export function useKeyboardNavigation(options: UseKeyboardNavigationOptions = {}) {
  const { enabled = true, shortcuts: customShortcuts = [] } = options
  const navigate = useNavigate()

  // Default navigation shortcuts
  const defaultShortcuts: KeyboardShortcut[] = React.useMemo(
    () => [
      {
        key: 'h',
        altKey: true,
        action: () => navigate({ to: ROUTES.HOME }),
        description: 'Go to Dashboard',
      },
      {
        key: 't',
        altKey: true,
        action: () => navigate({ to: ROUTES.TEMPLATES }),
        description: 'Go to Templates',
      },
      {
        key: 'y',
        altKey: true,
        action: () => navigate({ to: ROUTES.HISTORY }),
        description: 'Go to History',
      },
      {
        key: 's',
        altKey: true,
        action: () => navigate({ to: ROUTES.SETTINGS.S3 }),
        description: 'Go to Settings',
      },
      {
        key: '/',
        ctrlKey: true,
        action: () => {
          // Focus search input if available
          const searchInput = document.querySelector<HTMLInputElement>(
            '[data-search-input], input[type="search"]'
          )
          if (searchInput) {
            searchInput.focus()
          }
        },
        description: 'Focus search',
      },
    ],
    [navigate]
  )

  // Combine default and custom shortcuts
  const allShortcuts = React.useMemo(
    () => [...defaultShortcuts, ...customShortcuts],
    [defaultShortcuts, customShortcuts]
  )

  // Handle keydown events
  React.useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      for (const shortcut of allShortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const matchesCtrl = !!shortcut.ctrlKey === event.ctrlKey
        const matchesMeta = !!shortcut.metaKey === event.metaKey
        const matchesShift = !!shortcut.shiftKey === event.shiftKey
        const matchesAlt = !!shortcut.altKey === event.altKey

        if (matchesKey && matchesCtrl && matchesMeta && matchesShift && matchesAlt) {
          event.preventDefault()
          shortcut.action()
          return
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, allShortcuts])

  return {
    shortcuts: allShortcuts,
  }
}

/**
 * Hook for focus management
 */
export function useFocusManagement() {
  const focusMainContent = React.useCallback(() => {
    const main = document.getElementById('main-content')
    if (main) {
      main.focus()
    }
  }, [])

  const focusFirstFocusable = React.useCallback((container?: HTMLElement) => {
    const root = container || document
    const focusable = root.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable) {
      focusable.focus()
    }
  }, [])

  const trapFocus = React.useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return

      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          event.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    container.addEventListener('keydown', handleTab)
    return () => container.removeEventListener('keydown', handleTab)
  }, [])

  return {
    focusMainContent,
    focusFirstFocusable,
    trapFocus,
  }
}

/**
 * Hook for skip links
 */
export function useSkipLinks() {
  const [showSkipLinks, setShowSkipLinks] = React.useState(false)

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && !showSkipLinks) {
        setShowSkipLinks(true)
      }
    }

    const handleMouseDown = () => {
      setShowSkipLinks(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [showSkipLinks])

  return { showSkipLinks }
}

/**
 * Skip Links Component
 */
export function SkipLinks() {
  const { showSkipLinks } = useSkipLinks()

  if (!showSkipLinks) return null

  return (
    <div className="sr-only focus-within:not-sr-only">
      <a
        href="#main-content"
        className="absolute left-4 top-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
    </div>
  )
}

export default useKeyboardNavigation
