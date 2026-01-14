/**
 * Main Layout Component
 * Provides the main app layout with navigation sidebar and content area
 */

import * as React from 'react'
import { useLocation } from '@tanstack/react-router'
import { cn } from '~/lib/utils'
import { Sidebar, MobileSidebar, MobileMenuButton } from './Sidebar'
import { Breadcrumbs, CompactBreadcrumbs } from './Breadcrumbs'
import { useNavigationContext } from '../context/NavigationContext'
import { getRouteName } from '../routes'

interface MainLayoutProps {
  children: React.ReactNode
  className?: string
  showBreadcrumbs?: boolean
  showHeader?: boolean
}

export function MainLayout({
  children,
  className,
  showBreadcrumbs = true,
  showHeader = true,
}: MainLayoutProps) {
  const location = useLocation()
  const { isSidebarCollapsed, setIsSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen } =
    useNavigationContext()

  const pageName = getRouteName(location.pathname)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <Sidebar
        className="hidden lg:flex"
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        {showHeader && (
          <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-card px-4 lg:px-6">
            <MobileMenuButton onClick={() => setIsMobileMenuOpen(true)} />

            {/* Breadcrumbs - desktop */}
            {showBreadcrumbs && (
              <Breadcrumbs className="hidden md:flex" />
            )}

            {/* Compact Breadcrumbs - mobile */}
            {showBreadcrumbs && (
              <CompactBreadcrumbs className="md:hidden" />
            )}

            {/* Screen reader announcement */}
            <div className="sr-only" role="status" aria-live="polite">
              Currently viewing {pageName}
            </div>
          </header>
        )}

        {/* Page Content */}
        <main
          className={cn(
            'flex-1 overflow-auto focus:outline-none',
            className
          )}
          id="main-content"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * Minimal Layout - No sidebar, just content
 * Use for auth pages, onboarding, etc.
 */
export function MinimalLayout({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-h-screen bg-background', className)}>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  )
}

/**
 * Page Header Component
 * Consistent header for pages within the main layout
 */
interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, children, className }: PageHeaderProps) {
  // Support both actions prop and children for flexibility
  const headerActions = actions || children
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
    </div>
  )
}

/**
 * Page Container Component
 * Consistent padding/spacing for page content
 */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('container mx-auto p-6 lg:p-8', className)}>
      {children}
    </div>
  )
}

export default MainLayout
