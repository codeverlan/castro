/**
 * Authentication Guard Component
 * Protects routes that require authentication
 */

import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ROUTES } from '../routes'

// Auth context interface
export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
}

export interface User {
  id: string
  email?: string
  name?: string
}

// Default auth state (for now, assume authenticated since no auth system exists yet)
const defaultAuthState: AuthState = {
  isAuthenticated: true, // Default to true until auth is implemented
  isLoading: false,
  user: null,
}

// Auth context
const AuthContext = React.createContext<{
  authState: AuthState
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>
  login: (user: User) => void
  logout: () => void
}>({
  authState: defaultAuthState,
  setAuthState: () => {},
  login: () => {},
  logout: () => {},
})

/**
 * Auth Provider Component
 * Wraps the app to provide authentication state
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = React.useState<AuthState>(() => {
    // Check for stored auth state on mount
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('castro-auth-state')
        if (stored) {
          const parsed = JSON.parse(stored)
          return {
            ...defaultAuthState,
            ...parsed,
            isLoading: false,
          }
        }
      } catch {
        // Ignore parsing errors
      }
    }
    return defaultAuthState
  })

  // Persist auth state to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        'castro-auth-state',
        JSON.stringify({
          isAuthenticated: authState.isAuthenticated,
          user: authState.user,
        })
      )
    }
  }, [authState])

  const login = React.useCallback((user: User) => {
    setAuthState({
      isAuthenticated: true,
      isLoading: false,
      user,
    })
  }, [])

  const logout = React.useCallback(() => {
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
    })
    if (typeof window !== 'undefined') {
      localStorage.removeItem('castro-auth-state')
    }
  }, [])

  const value = React.useMemo(
    () => ({
      authState,
      setAuthState,
      login,
      logout,
    }),
    [authState, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to access auth state and actions
 */
export function useAuth() {
  const context = React.useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Auth Guard Props
 */
interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  requireAuth?: boolean
}

/**
 * Auth Guard Component
 * Renders children only if authentication requirements are met
 */
export function AuthGuard({
  children,
  fallback,
  redirectTo,
  requireAuth = true,
}: AuthGuardProps) {
  const navigate = useNavigate()
  const { authState } = useAuth()

  // Handle loading state
  if (authState.isLoading) {
    return fallback ? <>{fallback}</> : <AuthLoadingFallback />
  }

  // If auth is required but user is not authenticated
  if (requireAuth && !authState.isAuthenticated) {
    // Redirect if redirectTo is provided
    if (redirectTo) {
      React.useEffect(() => {
        navigate({ to: redirectTo })
      }, [navigate, redirectTo])
      return fallback ? <>{fallback}</> : <AuthLoadingFallback />
    }

    // Otherwise show fallback or null
    return fallback ? <>{fallback}</> : null
  }

  // If route should only be shown to unauthenticated users (e.g., login page)
  if (!requireAuth && authState.isAuthenticated && redirectTo) {
    React.useEffect(() => {
      navigate({ to: redirectTo })
    }, [navigate, redirectTo])
    return fallback ? <>{fallback}</> : <AuthLoadingFallback />
  }

  return <>{children}</>
}

/**
 * Default loading fallback component
 */
function AuthLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}

/**
 * Higher-order component for protecting routes
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    fallback?: React.ReactNode
    redirectTo?: string
    requireAuth?: boolean
  }
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

/**
 * Hook for checking if user is authenticated
 */
export function useIsAuthenticated(): boolean {
  const { authState } = useAuth()
  return authState.isAuthenticated
}

/**
 * Hook for getting current user
 */
export function useCurrentUser(): User | null {
  const { authState } = useAuth()
  return authState.user
}

export default AuthGuard
