/**
 * Navigation Service
 * Provides imperative navigation outside of React components
 * and manages navigation state/history
 */

import type { Router } from '@tanstack/react-router'
import { ROUTES, getRouteName } from './routes'

// Singleton router reference
let routerInstance: Router<any, any, any, any> | null = null

// Navigation history for back/forward tracking
const navigationHistory: string[] = []
const MAX_HISTORY_LENGTH = 50

// Event listeners for navigation changes
type NavigationListener = (pathname: string, previousPath?: string) => void
const navigationListeners: Set<NavigationListener> = new Set()

/**
 * Initialize the navigation service with the router instance
 */
export function initNavigationService(router: Router<any, any, any, any>): void {
  routerInstance = router

  // Subscribe to route changes
  router.subscribe('onResolved', ({ toLocation }) => {
    const pathname = toLocation.pathname
    const previousPath = navigationHistory[navigationHistory.length - 1]

    // Add to history if different from last
    if (pathname !== previousPath) {
      navigationHistory.push(pathname)

      // Trim history if too long
      if (navigationHistory.length > MAX_HISTORY_LENGTH) {
        navigationHistory.shift()
      }
    }

    // Notify listeners
    notifyListeners(pathname, previousPath)
  })
}

/**
 * Navigate to a path programmatically
 */
export function navigateTo(path: string, options?: { replace?: boolean }): void {
  if (!routerInstance) {
    console.warn('NavigationService: Router not initialized')
    return
  }

  if (options?.replace) {
    routerInstance.navigate({ to: path, replace: true })
  } else {
    routerInstance.navigate({ to: path })
  }
}

/**
 * Navigate back in history
 */
export function goBack(): void {
  if (!routerInstance) {
    console.warn('NavigationService: Router not initialized')
    return
  }

  routerInstance.history.back()
}

/**
 * Navigate forward in history
 */
export function goForward(): void {
  if (!routerInstance) {
    console.warn('NavigationService: Router not initialized')
    return
  }

  routerInstance.history.forward()
}

/**
 * Navigate to home
 */
export function goHome(): void {
  navigateTo(ROUTES.HOME)
}

/**
 * Get current pathname
 */
export function getCurrentPath(): string {
  if (!routerInstance) {
    return '/'
  }

  return routerInstance.state.location.pathname
}

/**
 * Get current route name
 */
export function getCurrentRouteName(): string {
  return getRouteName(getCurrentPath())
}

/**
 * Check if we can go back
 */
export function canGoBack(): boolean {
  return navigationHistory.length > 1
}

/**
 * Get navigation history
 */
export function getNavigationHistory(): readonly string[] {
  return [...navigationHistory]
}

/**
 * Subscribe to navigation changes
 */
export function onNavigationChange(listener: NavigationListener): () => void {
  navigationListeners.add(listener)

  return () => {
    navigationListeners.delete(listener)
  }
}

/**
 * Notify all listeners of navigation change
 */
function notifyListeners(pathname: string, previousPath?: string): void {
  navigationListeners.forEach((listener) => {
    try {
      listener(pathname, previousPath)
    } catch (error) {
      console.error('NavigationService: Error in navigation listener', error)
    }
  })
}

/**
 * Preload a route for faster navigation
 */
export function preloadRoute(path: string): void {
  if (!routerInstance) {
    return
  }

  routerInstance.preloadRoute({ to: path }).catch(() => {
    // Silently fail - preloading is just an optimization
  })
}

/**
 * Check if a route matches the current path
 */
export function isCurrentRoute(path: string): boolean {
  return getCurrentPath() === path
}

/**
 * Check if a route is active (matches current or is parent)
 */
export function isRouteActive(path: string): boolean {
  const currentPath = getCurrentPath()
  return currentPath === path || currentPath.startsWith(path + '/')
}

/**
 * Navigate with params
 */
export function navigateWithParams<T extends Record<string, string>>(
  path: string,
  params: T,
  options?: { replace?: boolean }
): void {
  if (!routerInstance) {
    console.warn('NavigationService: Router not initialized')
    return
  }

  routerInstance.navigate({
    to: path,
    params,
    replace: options?.replace,
  })
}

/**
 * Navigate with search params
 */
export function navigateWithSearch<T extends Record<string, string>>(
  path: string,
  search: T,
  options?: { replace?: boolean }
): void {
  if (!routerInstance) {
    console.warn('NavigationService: Router not initialized')
    return
  }

  routerInstance.navigate({
    to: path,
    search,
    replace: options?.replace,
  })
}

// Export navigation service object for convenient access
export const NavigationService = {
  init: initNavigationService,
  navigateTo,
  goBack,
  goForward,
  goHome,
  getCurrentPath,
  getCurrentRouteName,
  canGoBack,
  getNavigationHistory,
  onNavigationChange,
  preloadRoute,
  isCurrentRoute,
  isRouteActive,
  navigateWithParams,
  navigateWithSearch,
  ROUTES,
}

export default NavigationService
