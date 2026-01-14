/**
 * Route Constants and Type Definitions
 * Centralized route definitions for type-safe navigation
 */

// Route path constants
export const ROUTES = {
  // Main routes
  HOME: '/',
  TEMPLATES: '/templates',
  HISTORY: '/history',

  // Settings routes
  SETTINGS: {
    ROOT: '/settings',
    ENVIRONMENT: '/settings/environment',
    S3: '/settings/s3',
    PROMPTS: '/settings/prompts',
    INTAKEQ_TYPES: '/settings/intakeq-types',
  },

  // Session routes (for future expansion)
  SESSIONS: {
    ROOT: '/sessions',
    DETAIL: (id: string) => `/sessions/${id}` as const,
  },

  // API routes (for reference)
  API: {
    SESSIONS: '/api/sessions',
    SESSIONS_HISTORY: '/api/sessions/history',
    TEMPLATES: '/api/templates',
    TEMPLATE_BY_ID: (id: string) => `/api/templates/${id}` as const,
    NOTES: '/api/notes',
    NOTE_BY_ID: (noteId: string) => `/api/notes/${noteId}` as const,
    NOTES_EXPORT: '/api/notes/export',
    GAPS: '/api/gaps',
    GAP_BY_ID: (id: string) => `/api/gaps/${id}` as const,
    GAPS_BATCH: '/api/gaps/batch',
    AUDIT_LOGS: '/api/audit-logs',
    S3_CREDENTIALS: '/api/s3-credentials',
  },
} as const

// Route names for display and analytics
export const ROUTE_NAMES: Record<string, string> = {
  '/': 'Dashboard',
  '/templates': 'Note Templates',
  '/history': 'Session History',
  '/settings/environment': 'Environment Settings',
  '/settings/s3': 'S3 Credentials',
  '/settings/prompts': 'AI Prompts',
  '/settings/intakeq-types': 'IntakeQ Note Types',
}

// Route metadata for navigation structure
export interface RouteConfig {
  path: string
  name: string
  icon?: string
  requiresAuth?: boolean
  showInNav?: boolean
  parent?: string
  children?: RouteConfig[]
}

// Main navigation items
export const NAV_ITEMS: RouteConfig[] = [
  {
    path: ROUTES.HOME,
    name: 'Dashboard',
    icon: 'home',
    showInNav: true,
    requiresAuth: true,
  },
  {
    path: ROUTES.TEMPLATES,
    name: 'Templates',
    icon: 'file-text',
    showInNav: true,
    requiresAuth: true,
  },
  {
    path: ROUTES.HISTORY,
    name: 'History',
    icon: 'history',
    showInNav: true,
    requiresAuth: true,
  },
  {
    path: ROUTES.SETTINGS.S3,
    name: 'S3 Credentials',
    icon: 'cloud',
    showInNav: true,
    requiresAuth: true,
    parent: '/settings',
  },
]

// Settings navigation items
export const SETTINGS_NAV_ITEMS: RouteConfig[] = [
  {
    path: ROUTES.SETTINGS.ENVIRONMENT,
    name: 'Environment',
    icon: 'settings',
    showInNav: true,
    requiresAuth: true,
  },
  {
    path: ROUTES.SETTINGS.S3,
    name: 'S3 Credentials',
    icon: 'cloud',
    showInNav: true,
    requiresAuth: true,
  },
  {
    path: ROUTES.SETTINGS.PROMPTS,
    name: 'AI Prompts',
    icon: 'brain',
    showInNav: true,
    requiresAuth: true,
  },
  {
    path: ROUTES.SETTINGS.INTAKEQ_TYPES,
    name: 'IntakeQ Note Types',
    icon: 'clipboard-list',
    showInNav: true,
    requiresAuth: true,
  },
]

// Type-safe route params
export interface RouteParams {
  '/sessions/:id': { id: string }
  '/api/templates/:id': { id: string }
  '/api/notes/:noteId': { noteId: string }
  '/api/gaps/:id': { id: string }
  '/api/s3-credentials/update/:id': { id: string }
  '/api/s3-credentials/test/:id': { id: string }
  '/api/s3-credentials/delete/:id': { id: string }
}

// Breadcrumb configuration
export interface BreadcrumbItem {
  label: string
  path?: string
}

export const BREADCRUMB_CONFIG: Record<string, BreadcrumbItem[]> = {
  '/': [{ label: 'Dashboard' }],
  '/templates': [
    { label: 'Dashboard', path: '/' },
    { label: 'Templates' },
  ],
  '/history': [
    { label: 'Dashboard', path: '/' },
    { label: 'History' },
  ],
  '/settings/environment': [
    { label: 'Dashboard', path: '/' },
    { label: 'Settings' },
    { label: 'Environment' },
  ],
  '/settings/s3': [
    { label: 'Dashboard', path: '/' },
    { label: 'Settings' },
    { label: 'S3 Credentials' },
  ],
  '/settings/prompts': [
    { label: 'Dashboard', path: '/' },
    { label: 'Settings' },
    { label: 'AI Prompts' },
  ],
  '/settings/intakeq-types': [
    { label: 'Dashboard', path: '/' },
    { label: 'Settings' },
    { label: 'IntakeQ Note Types' },
  ],
}

// Helper to get breadcrumbs for a route
export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  return BREADCRUMB_CONFIG[pathname] || [
    { label: 'Dashboard', path: '/' },
    { label: ROUTE_NAMES[pathname] || 'Page' },
  ]
}

// Helper to get route name
export function getRouteName(pathname: string): string {
  return ROUTE_NAMES[pathname] || 'Page'
}

// Helper to check if route requires auth
export function routeRequiresAuth(pathname: string): boolean {
  const route = NAV_ITEMS.find((r) => r.path === pathname)
  return route?.requiresAuth ?? true
}
