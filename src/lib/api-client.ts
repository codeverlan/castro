/**
 * Configurable API Client
 * Abstracts API calls to support both standalone and embedded modes
 */

type ApiClientConfig = {
  baseUrl: string;
  headers?: Record<string, string>;
  credentials?: RequestCredentials;
};

const defaultConfig: ApiClientConfig = {
  baseUrl: typeof window !== 'undefined' ? '' : 'http://localhost:3001',
  credentials: 'include',
};

let currentConfig: ApiClientConfig = { ...defaultConfig };

/**
 * Configure the API client
 */
export function configureApiClient(config: Partial<ApiClientConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get the current API configuration
 */
export function getApiConfig(): ApiClientConfig {
  return { ...currentConfig };
}

/**
 * Detect if running in embedded mode (within LMHG-Workspace)
 */
export function isEmbeddedMode(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { __LMHG_WORKSPACE_CONTEXT__?: unknown }).__LMHG_WORKSPACE_CONTEXT__;
}

/**
 * Initialize API client based on environment
 * Call this early in the application lifecycle
 */
export function initializeApiClient(): void {
  if (typeof window === 'undefined') {
    // Server-side: use default config
    return;
  }

  if (isEmbeddedMode()) {
    // Embedded mode: use Castro API server
    const context = (window as unknown as { __LMHG_WORKSPACE_CONTEXT__?: { castroApiUrl?: string } }).__LMHG_WORKSPACE_CONTEXT__;
    if (context?.castroApiUrl) {
      configureApiClient({ baseUrl: context.castroApiUrl });
    } else {
      configureApiClient({ baseUrl: 'http://localhost:3001' });
    }
  } else {
    // Standalone mode: Castro API runs on port 3001
    configureApiClient({ baseUrl: 'http://localhost:3001' });
  }
}

/**
 * Build full URL for API endpoint
 */
function buildUrl(endpoint: string): string {
  const base = currentConfig.baseUrl.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Generic API request function
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: { code: string; message: string }; status: number }> {
  const url = buildUrl(endpoint);

  const headers = {
    'Content-Type': 'application/json',
    ...currentConfig.headers,
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: currentConfig.credentials,
    });

    const json = await response.json();

    if (!response.ok) {
      return {
        error: json.error || { code: 'UNKNOWN_ERROR', message: 'Request failed' },
        status: response.status,
      };
    }

    return { data: json.data, status: response.status };
  } catch (error) {
    return {
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
      },
      status: 0,
    };
  }
}

/**
 * API Client with typed methods
 */
export const apiClient = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PUT request
   */
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    }),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};

// Type-safe API endpoints
export const api = {
  sessions: {
    list: (params?: { limit?: number; status?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.status) searchParams.set('status', params.status);
      const query = searchParams.toString();
      return apiClient.get<unknown[]>(`/api/sessions${query ? `?${query}` : ''}`);
    },
    getHistory: (params?: Record<string, unknown>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient.get<unknown[]>(`/api/sessions/history${query ? `?${query}` : ''}`);
    },
    getSections: (sessionId: string) =>
      apiClient.get<unknown[]>(`/api/sessions/${sessionId}/sections`),
  },

  templates: {
    list: (params?: Record<string, unknown>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient.get<unknown[]>(`/api/templates${query ? `?${query}` : ''}`);
    },
    get: (id: string) => apiClient.get<unknown>(`/api/templates/${id}`),
    create: (data: unknown) => apiClient.post<unknown>('/api/templates', data),
    update: (id: string, data: unknown) => apiClient.put<unknown>(`/api/templates/${id}`, data),
    delete: (id: string, hard = false) =>
      apiClient.delete<unknown>(`/api/templates/${id}${hard ? '?hard=true' : ''}`),
  },

  recordings: {
    list: (params?: Record<string, unknown>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient.get<unknown[]>(`/api/recordings${query ? `?${query}` : ''}`);
    },
    get: (id: string) => apiClient.get<unknown>(`/api/recordings/${id}`),
    create: (data: unknown) => apiClient.post<unknown>('/api/recordings', data),
    complete: (id: string, data?: unknown) =>
      apiClient.post<unknown>(`/api/recordings/${id}/complete`, data),
    attach: (id: string, sessionId: string) =>
      apiClient.post<unknown>(`/api/recordings/${id}/attach`, { sessionId }),
  },

  gaps: {
    list: (sessionId: string, params?: Record<string, unknown>) => {
      const searchParams = new URLSearchParams({ sessionId });
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        });
      }
      return apiClient.get<unknown>(`/api/gaps?${searchParams.toString()}`);
    },
    analyze: (sessionId: string, options?: unknown) =>
      apiClient.post<unknown>('/api/gaps', { sessionId, options }),
    get: (id: string) => apiClient.get<unknown>(`/api/gaps/${id}`),
    update: (id: string, data: unknown) => apiClient.patch<unknown>(`/api/gaps/${id}`, data),
    batchResolve: (gapIds: string[], responses?: string[]) =>
      apiClient.post<unknown>('/api/gaps/batch', { gapIds, responses }),
  },

  notes: {
    generate: (data: unknown) => apiClient.post<unknown>('/api/notes', data),
    getBySession: (sessionId: string) =>
      apiClient.get<unknown>(`/api/notes?sessionId=${sessionId}`),
    get: (noteId: string) => apiClient.get<unknown>(`/api/notes/${noteId}`),
    export: (noteId: string, format?: string) =>
      apiClient.post<unknown>('/api/notes/export', { noteId, format }),
  },

  prompts: {
    list: (params?: Record<string, unknown>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient.get<unknown[]>(`/api/prompts${query ? `?${query}` : ''}`);
    },
    get: (id: string) => apiClient.get<unknown>(`/api/prompts/${id}`),
    create: (data: unknown) => apiClient.post<unknown>('/api/prompts', data),
    update: (id: string, data: unknown) => apiClient.put<unknown>(`/api/prompts/${id}`, data),
    delete: (id: string) => apiClient.delete<unknown>(`/api/prompts/${id}`),
    duplicate: (id: string) => apiClient.post<unknown>(`/api/prompts/${id}/duplicate`),
  },

  intakeq: {
    getSettings: () => apiClient.get<unknown>('/api/intakeq/settings'),
    getAppointments: (params?: Record<string, unknown>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient.get<unknown>(`/api/intakeq/appointments${query ? `?${query}` : ''}`);
    },
    getConfig: () => apiClient.get<unknown>('/api/intakeq/config'),
    saveConfig: (data: unknown) => apiClient.post<unknown>('/api/intakeq/config', data),
    test: (apiKey?: string) => apiClient.post<unknown>('/api/intakeq/test', { apiKey }),
    getNoteTypes: () => apiClient.get<unknown[]>('/api/intakeq/note-types'),
    getNoteType: (id: string) => apiClient.get<unknown>(`/api/intakeq/note-types/${id}`),
  },

  s3Credentials: {
    list: (params?: Record<string, unknown>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient.get<unknown[]>(`/api/s3-credentials${query ? `?${query}` : ''}`);
    },
    create: (data: unknown) => apiClient.post<unknown>('/api/s3-credentials', data),
    update: (id: string, data: unknown) =>
      apiClient.put<unknown>(`/api/s3-credentials/update/${id}`, data),
    delete: (id: string) => apiClient.delete<unknown>(`/api/s3-credentials/delete/${id}`),
    test: (id: string) => apiClient.post<unknown>(`/api/s3-credentials/test/${id}`),
  },

  auditLogs: {
    list: (params?: Record<string, unknown>) => {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        });
      }
      const query = searchParams.toString();
      return apiClient.get<unknown[]>(`/api/audit-logs${query ? `?${query}` : ''}`);
    },
    getSummary: (days?: number) =>
      apiClient.get<unknown>(`/api/audit-logs/summary${days ? `?days=${days}` : ''}`),
  },

  health: () => apiClient.get<{ status: string; timestamp: string }>('/health'),
};
