/**
 * Navigation Context
 * Provides navigation state and utilities to the app
 */

import * as React from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { getRouteName, getBreadcrumbs, type BreadcrumbItem } from '../routes'

// Storage key for persisting navigation state
const STORAGE_KEY = 'castro-navigation-state'

interface NavigationState {
  isSidebarCollapsed: boolean
  isMobileMenuOpen: boolean
  lastVisitedRoutes: string[]
}

interface NavigationContextValue extends NavigationState {
  // State setters
  setIsSidebarCollapsed: (collapsed: boolean) => void
  setIsMobileMenuOpen: (open: boolean) => void

  // Computed values
  currentPath: string
  currentRouteName: string
  breadcrumbs: BreadcrumbItem[]

  // Navigation utilities
  navigateTo: (path: string) => void
  goBack: () => void
  canGoBack: boolean

  // History tracking
  addToHistory: (path: string) => void
}

const NavigationContext = React.createContext<NavigationContextValue | null>(null)

// Load persisted state from localStorage
function loadPersistedState(): Partial<NavigationState> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // Ignore errors
  }

  return {}
}

// Save state to localStorage
function persistState(state: Partial<NavigationState>): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore errors
  }
}

interface NavigationProviderProps {
  children: React.ReactNode
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const location = useLocation()
  const navigate = useNavigate()

  // Initialize state from localStorage
  const [state, setState] = React.useState<NavigationState>(() => ({
    isSidebarCollapsed: false,
    isMobileMenuOpen: false,
    lastVisitedRoutes: [],
    ...loadPersistedState(),
  }))

  // Persist state changes
  React.useEffect(() => {
    persistState({
      isSidebarCollapsed: state.isSidebarCollapsed,
      lastVisitedRoutes: state.lastVisitedRoutes.slice(-10), // Keep last 10 routes
    })
  }, [state.isSidebarCollapsed, state.lastVisitedRoutes])

  // Track route visits
  React.useEffect(() => {
    const path = location.pathname
    setState((prev) => {
      // Don't add duplicate consecutive entries
      if (prev.lastVisitedRoutes[prev.lastVisitedRoutes.length - 1] === path) {
        return prev
      }

      return {
        ...prev,
        lastVisitedRoutes: [...prev.lastVisitedRoutes, path].slice(-20), // Keep last 20
      }
    })
  }, [location.pathname])

  // Announce route changes for screen readers
  React.useEffect(() => {
    const routeName = getRouteName(location.pathname)

    // Create or update the announcement element
    let announcer = document.getElementById('route-announcer')
    if (!announcer) {
      announcer = document.createElement('div')
      announcer.id = 'route-announcer'
      announcer.setAttribute('role', 'status')
      announcer.setAttribute('aria-live', 'polite')
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      document.body.appendChild(announcer)
    }

    // Announce the new route
    announcer.textContent = `Navigated to ${routeName}`

    // Focus main content for keyboard users
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.focus()
    }
  }, [location.pathname])

  // Computed values
  const currentPath = location.pathname
  const currentRouteName = getRouteName(currentPath)
  const breadcrumbs = getBreadcrumbs(currentPath)
  const canGoBack = state.lastVisitedRoutes.length > 1

  // State setters - bail out if value unchanged to prevent infinite loops
  const setIsSidebarCollapsed = React.useCallback((collapsed: boolean) => {
    setState((prev) => {
      if (prev.isSidebarCollapsed === collapsed) return prev
      return { ...prev, isSidebarCollapsed: collapsed }
    })
  }, [])

  const setIsMobileMenuOpen = React.useCallback((open: boolean) => {
    setState((prev) => {
      if (prev.isMobileMenuOpen === open) return prev
      return { ...prev, isMobileMenuOpen: open }
    })
  }, [])

  // Navigation utilities
  const navigateTo = React.useCallback(
    (path: string) => {
      navigate({ to: path })
    },
    [navigate]
  )

  const goBack = React.useCallback(() => {
    if (canGoBack) {
      // Navigate to the previous route in our history
      const previousRoutes = [...state.lastVisitedRoutes]
      previousRoutes.pop() // Remove current
      const previousPath = previousRoutes[previousRoutes.length - 1] || '/'
      navigate({ to: previousPath })
    }
  }, [canGoBack, state.lastVisitedRoutes, navigate])

  const addToHistory = React.useCallback((path: string) => {
    setState((prev) => ({
      ...prev,
      lastVisitedRoutes: [...prev.lastVisitedRoutes, path].slice(-20),
    }))
  }, [])

  const value = React.useMemo<NavigationContextValue>(
    () => ({
      ...state,
      setIsSidebarCollapsed,
      setIsMobileMenuOpen,
      currentPath,
      currentRouteName,
      breadcrumbs,
      navigateTo,
      goBack,
      canGoBack,
      addToHistory,
    }),
    [
      state,
      setIsSidebarCollapsed,
      setIsMobileMenuOpen,
      currentPath,
      currentRouteName,
      breadcrumbs,
      navigateTo,
      goBack,
      canGoBack,
      addToHistory,
    ]
  )

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

/**
 * Hook to access navigation context
 */
export function useNavigationContext() {
  const context = React.useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigationContext must be used within a NavigationProvider')
  }
  return context
}

/**
 * Hook for just the current route info
 */
export function useCurrentRoute() {
  const context = useNavigationContext()
  return {
    path: context.currentPath,
    name: context.currentRouteName,
    breadcrumbs: context.breadcrumbs,
  }
}

/**
 * Hook for navigation utilities
 */
export function useNavigation() {
  const context = useNavigationContext()
  return {
    navigateTo: context.navigateTo,
    goBack: context.goBack,
    canGoBack: context.canGoBack,
  }
}

export default NavigationContext
