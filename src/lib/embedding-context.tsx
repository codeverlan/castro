/**
 * Embedding Context
 * Provides context for dual-mode rendering (standalone vs embedded in LMHG-Workspace)
 */

import * as React from 'react';

export interface EmbeddingConfig {
  /** Whether Castro is embedded within LMHG-Workspace */
  isEmbedded: boolean;
  /** API base URL (empty for same-origin, or http://localhost:3001 for cross-origin) */
  apiBaseUrl: string;
  /** Navigation callback for when embedded - replaces router navigation */
  onNavigate?: (path: string, params?: Record<string, unknown>) => void;
  /** User ID from host application */
  hostUserId?: string;
  /** Theme sync callback */
  onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
}

interface EmbeddingContextValue extends EmbeddingConfig {
  /** Navigate to a path - uses router when standalone, callback when embedded */
  navigate: (path: string, params?: Record<string, unknown>) => void;
}

const defaultConfig: EmbeddingConfig = {
  isEmbedded: false,
  apiBaseUrl: '',
};

const EmbeddingContext = React.createContext<EmbeddingContextValue | undefined>(
  undefined
);

/**
 * Detect if running in embedded mode via global context
 */
function detectEmbeddedMode(): EmbeddingConfig {
  if (typeof window === 'undefined') {
    return defaultConfig;
  }

  const context = (
    window as unknown as {
      __LMHG_WORKSPACE_CONTEXT__?: {
        castroApiUrl?: string;
        userId?: string;
        onNavigate?: (path: string, params?: Record<string, unknown>) => void;
        onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
      };
    }
  ).__LMHG_WORKSPACE_CONTEXT__;

  if (context) {
    return {
      isEmbedded: true,
      apiBaseUrl: context.castroApiUrl || 'http://localhost:3001',
      onNavigate: context.onNavigate,
      hostUserId: context.userId,
      onThemeChange: context.onThemeChange,
    };
  }

  return defaultConfig;
}

export interface EmbeddingProviderProps {
  children: React.ReactNode;
  /** Override auto-detection with explicit config */
  config?: Partial<EmbeddingConfig>;
}

/**
 * Provider for embedding context
 * Auto-detects embedded mode or accepts explicit configuration
 */
export function EmbeddingProvider({ children, config }: EmbeddingProviderProps) {
  const detectedConfig = React.useMemo(() => detectEmbeddedMode(), []);
  const mergedConfig = React.useMemo(
    () => ({
      ...detectedConfig,
      ...config,
    }),
    [detectedConfig, config]
  );

  const navigate = React.useCallback(
    (path: string, params?: Record<string, unknown>) => {
      if (mergedConfig.isEmbedded && mergedConfig.onNavigate) {
        mergedConfig.onNavigate(path, params);
      } else {
        // In standalone mode, use the browser's history API
        // This will be picked up by TanStack Router
        const url = new URL(path, window.location.origin);
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.set(key, String(value));
            }
          });
        }
        window.history.pushState({}, '', url.pathname + url.search);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    },
    [mergedConfig]
  );

  const value = React.useMemo<EmbeddingContextValue>(
    () => ({
      ...mergedConfig,
      navigate,
    }),
    [mergedConfig, navigate]
  );

  return (
    <EmbeddingContext.Provider value={value}>
      {children}
    </EmbeddingContext.Provider>
  );
}

/**
 * Hook to access embedding context
 */
export function useEmbedding(): EmbeddingContextValue {
  const context = React.useContext(EmbeddingContext);
  if (!context) {
    // Return default values if used outside provider (for backwards compatibility)
    return {
      ...defaultConfig,
      navigate: (path: string) => {
        window.history.pushState({}, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
      },
    };
  }
  return context;
}

/**
 * Hook to check if running in embedded mode
 */
export function useIsEmbedded(): boolean {
  const { isEmbedded } = useEmbedding();
  return isEmbedded;
}

/**
 * Hook to get the API base URL
 */
export function useApiBaseUrl(): string {
  const { apiBaseUrl } = useEmbedding();
  return apiBaseUrl;
}

/**
 * Utility to check embedded mode without hooks (for use outside React)
 */
export function isEmbeddedMode(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    window as unknown as { __LMHG_WORKSPACE_CONTEXT__?: unknown }
  ).__LMHG_WORKSPACE_CONTEXT__;
}
