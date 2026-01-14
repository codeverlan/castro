/**
 * Sidebar Navigation Component
 * Main navigation sidebar for the application
 */

import * as React from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  Home,
  FileText,
  History,
  Cloud,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react'
import { cn } from '~/lib/utils'
import { Button } from '~/components/ui/button'
import { NAV_ITEMS, ROUTES, type RouteConfig } from '../routes'

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  home: Home,
  'file-text': FileText,
  history: History,
  cloud: Cloud,
  settings: Settings,
}

interface SidebarProps {
  className?: string
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function Sidebar({ className, collapsed = false, onCollapsedChange }: SidebarProps) {
  const location = useLocation()
  const currentPath = location.pathname

  const toggleCollapsed = () => {
    onCollapsedChange?.(!collapsed)
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-card transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
      data-testid="sidebar"
    >
      {/* Logo/Brand Area */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">Castro</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className={cn(collapsed && 'mx-auto')}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-2" aria-label="Main navigation">
        {NAV_ITEMS.filter((item) => item.showInNav).map((item) => (
          <NavItem
            key={item.path}
            item={item}
            isActive={
              item.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.path)
            }
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-2">
        <NavItem
          item={{
            path: ROUTES.SETTINGS.S3,
            name: 'Settings',
            icon: 'settings',
            showInNav: true,
          }}
          isActive={currentPath.startsWith('/settings')}
          collapsed={collapsed}
        />
      </div>
    </aside>
  )
}

interface NavItemProps {
  item: RouteConfig
  isActive: boolean
  collapsed: boolean
}

function NavItem({ item, isActive, collapsed }: NavItemProps) {
  const Icon = item.icon ? iconMap[item.icon] : null

  return (
    <Link
      to={item.path}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground',
        collapsed && 'justify-center px-2'
      )}
      aria-current={isActive ? 'page' : undefined}
      title={collapsed ? item.name : undefined}
    >
      {Icon && <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />}
      {!collapsed && <span>{item.name}</span>}
    </Link>
  )
}

/**
 * Mobile Sidebar Component
 */
interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation()
  const currentPath = location.pathname

  // Close on route change - only if sidebar is open
  React.useEffect(() => {
    if (isOpen) {
      onClose()
    }
  }, [currentPath]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">Castro</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close menu">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2" aria-label="Mobile navigation">
          {NAV_ITEMS.filter((item) => item.showInNav).map((item) => (
            <NavItem
              key={item.path}
              item={item}
              isActive={
                item.path === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.path)
              }
              collapsed={false}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-2">
          <NavItem
            item={{
              path: ROUTES.SETTINGS.S3,
              name: 'Settings',
              icon: 'settings',
              showInNav: true,
            }}
            isActive={currentPath.startsWith('/settings')}
            collapsed={false}
          />
        </div>
      </aside>
    </>
  )
}

/**
 * Mobile Menu Toggle Button
 */
interface MobileMenuButtonProps {
  onClick: () => void
  className?: string
}

export function MobileMenuButton({ onClick, className }: MobileMenuButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={cn('lg:hidden', className)}
      aria-label="Open navigation menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

export default Sidebar
