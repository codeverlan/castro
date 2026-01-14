/**
 * Breadcrumbs Navigation Component
 * Shows the current navigation path for deep hierarchies
 */

import * as React from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight, Home } from 'lucide-react'
import { cn } from '~/lib/utils'
import { getBreadcrumbs, type BreadcrumbItem } from '../routes'

interface BreadcrumbsProps {
  className?: string
  items?: BreadcrumbItem[]
  showHomeIcon?: boolean
  separator?: React.ReactNode
}

export function Breadcrumbs({
  className,
  items,
  showHomeIcon = true,
  separator,
}: BreadcrumbsProps) {
  const location = useLocation()
  const breadcrumbItems = items || getBreadcrumbs(location.pathname)

  if (breadcrumbItems.length <= 1) {
    return null
  }

  const defaultSeparator = (
    <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
  )

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      <ol className="flex items-center gap-1" role="list">
        {breadcrumbItems.map((item, index) => {
          const isFirst = index === 0
          const isLast = index === breadcrumbItems.length - 1

          return (
            <li key={item.path || item.label} className="flex items-center gap-1">
              {!isFirst && (
                <span className="mx-1" aria-hidden="true">
                  {separator || defaultSeparator}
                </span>
              )}
              <BreadcrumbLink
                item={item}
                isLast={isLast}
                showHomeIcon={showHomeIcon && isFirst && item.path === '/'}
              />
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface BreadcrumbLinkProps {
  item: BreadcrumbItem
  isLast: boolean
  showHomeIcon: boolean
}

function BreadcrumbLink({ item, isLast, showHomeIcon }: BreadcrumbLinkProps) {
  const baseClasses = cn(
    'inline-flex items-center gap-1 transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'rounded px-1 py-0.5'
  )

  if (isLast || !item.path) {
    return (
      <span
        className={cn(baseClasses, 'text-foreground font-medium')}
        aria-current="page"
      >
        {showHomeIcon && <Home className="h-4 w-4" aria-hidden="true" />}
        {item.label}
      </span>
    )
  }

  return (
    <Link
      to={item.path}
      className={cn(
        baseClasses,
        'text-muted-foreground hover:text-foreground'
      )}
    >
      {showHomeIcon && <Home className="h-4 w-4" aria-hidden="true" />}
      {item.label}
    </Link>
  )
}

/**
 * Compact Breadcrumbs for mobile
 * Shows only the previous page and current page
 */
export function CompactBreadcrumbs({ className }: { className?: string }) {
  const location = useLocation()
  const breadcrumbItems = getBreadcrumbs(location.pathname)

  if (breadcrumbItems.length <= 1) {
    return null
  }

  // Get the previous item (parent) and current item
  const previousItem = breadcrumbItems[breadcrumbItems.length - 2]
  const currentItem = breadcrumbItems[breadcrumbItems.length - 1]

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
    >
      {previousItem.path ? (
        <Link
          to={previousItem.path}
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
          <span>Back to {previousItem.label}</span>
        </Link>
      ) : (
        <span className="text-muted-foreground">{currentItem.label}</span>
      )}
    </nav>
  )
}

export default Breadcrumbs
