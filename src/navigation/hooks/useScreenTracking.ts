/**
 * Screen Tracking Hook
 * Provides analytics and tracking for screen views
 */

import * as React from 'react'
import { useLocation } from '@tanstack/react-router'
import { getRouteName } from '../routes'

interface ScreenTrackingOptions {
  // Callback fired when a screen is viewed
  onScreenView?: (screenName: string, pathname: string) => void
  // Whether to track page views automatically
  autoTrack?: boolean
  // Custom analytics function
  analytics?: {
    track: (event: string, properties?: Record<string, unknown>) => void
  }
}

interface ScreenInfo {
  name: string
  pathname: string
  timestamp: number
  duration?: number
}

/**
 * Hook for tracking screen views
 */
export function useScreenTracking(options: ScreenTrackingOptions = {}) {
  const { onScreenView, autoTrack = true, analytics } = options
  const location = useLocation()
  const screenStartTime = React.useRef<number>(Date.now())
  const previousScreen = React.useRef<ScreenInfo | null>(null)

  // Track screen view on location change
  React.useEffect(() => {
    if (!autoTrack) return

    const pathname = location.pathname
    const screenName = getRouteName(pathname)
    const now = Date.now()

    // Calculate duration of previous screen
    if (previousScreen.current) {
      previousScreen.current.duration = now - previousScreen.current.timestamp
    }

    // Create new screen info
    const screenInfo: ScreenInfo = {
      name: screenName,
      pathname,
      timestamp: now,
    }

    // Track the screen view
    if (analytics) {
      analytics.track('screen_view', {
        screen_name: screenName,
        screen_path: pathname,
        previous_screen: previousScreen.current?.name,
        previous_duration_ms: previousScreen.current?.duration,
      })
    }

    // Fire callback
    onScreenView?.(screenName, pathname)

    // Update refs
    previousScreen.current = screenInfo
    screenStartTime.current = now

    // Log for development
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Screen Tracking]', {
        screen: screenName,
        path: pathname,
        timestamp: new Date(now).toISOString(),
      })
    }
  }, [location.pathname, autoTrack, analytics, onScreenView])

  // Track time spent on screen when leaving
  React.useEffect(() => {
    return () => {
      if (previousScreen.current) {
        const duration = Date.now() - screenStartTime.current
        if (analytics) {
          analytics.track('screen_leave', {
            screen_name: previousScreen.current.name,
            screen_path: previousScreen.current.pathname,
            duration_ms: duration,
          })
        }
      }
    }
  }, [analytics])

  // Manual tracking function
  const trackScreen = React.useCallback(
    (screenName: string, properties?: Record<string, unknown>) => {
      if (analytics) {
        analytics.track('screen_view', {
          screen_name: screenName,
          ...properties,
        })
      }
      onScreenView?.(screenName, location.pathname)
    },
    [analytics, onScreenView, location.pathname]
  )

  // Track custom event
  const trackEvent = React.useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      if (analytics) {
        analytics.track(eventName, {
          screen_name: getRouteName(location.pathname),
          screen_path: location.pathname,
          ...properties,
        })
      }
    },
    [analytics, location.pathname]
  )

  return {
    trackScreen,
    trackEvent,
    currentScreen: getRouteName(location.pathname),
    currentPath: location.pathname,
  }
}

/**
 * Hook for timing user interactions
 */
export function useInteractionTiming() {
  const startTimes = React.useRef<Map<string, number>>(new Map())

  const startTiming = React.useCallback((interactionId: string) => {
    startTimes.current.set(interactionId, Date.now())
  }, [])

  const endTiming = React.useCallback((interactionId: string) => {
    const startTime = startTimes.current.get(interactionId)
    if (!startTime) return null

    const duration = Date.now() - startTime
    startTimes.current.delete(interactionId)
    return duration
  }, [])

  const getTiming = React.useCallback((interactionId: string) => {
    const startTime = startTimes.current.get(interactionId)
    if (!startTime) return null
    return Date.now() - startTime
  }, [])

  return {
    startTiming,
    endTiming,
    getTiming,
  }
}

/**
 * Simple console-based analytics for development
 */
export const consoleAnalytics = {
  track: (event: string, properties?: Record<string, unknown>) => {
    console.log(`[Analytics] ${event}`, properties)
  },
}

export default useScreenTracking
