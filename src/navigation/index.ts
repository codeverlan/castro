/**
 * Navigation Module
 * Central export for all navigation-related functionality
 */

// Routes and configuration
export {
  ROUTES,
  ROUTE_NAMES,
  NAV_ITEMS,
  SETTINGS_NAV_ITEMS,
  BREADCRUMB_CONFIG,
  getBreadcrumbs,
  getRouteName,
  routeRequiresAuth,
  type RouteConfig,
  type RouteParams,
  type BreadcrumbItem,
} from './routes'

// Navigation service
export {
  NavigationService,
  initNavigationService,
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
} from './NavigationService'

// Auth guard
export {
  AuthGuard,
  AuthProvider,
  useAuth,
  useIsAuthenticated,
  useCurrentUser,
  withAuthGuard,
  type AuthState,
  type User,
} from './guards/AuthGuard'

// Components
export { Sidebar, MobileSidebar, MobileMenuButton } from './components/Sidebar'
export { Breadcrumbs, CompactBreadcrumbs } from './components/Breadcrumbs'
export {
  MainLayout,
  MinimalLayout,
  PageHeader,
  PageContainer,
} from './components/MainLayout'

// Context
export {
  NavigationProvider,
  useNavigationContext,
  useCurrentRoute,
  useNavigation,
} from './context/NavigationContext'

// Hooks
export {
  useScreenTracking,
  useInteractionTiming,
  consoleAnalytics,
} from './hooks/useScreenTracking'

export {
  useKeyboardNavigation,
  useFocusManagement,
  useSkipLinks,
  SkipLinks,
} from './hooks/useKeyboardNavigation.js'
