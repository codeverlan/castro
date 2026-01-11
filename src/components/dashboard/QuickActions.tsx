import * as React from "react"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { cn } from "~/lib/utils"
import {
  FolderOpen,
  FileText,
  Settings,
  RefreshCw,
  Upload,
  History
} from "lucide-react"

export interface QuickAction {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  onClick: () => void
  variant?: "default" | "secondary" | "outline" | "ghost"
}

export interface QuickActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  onOpenWatchFolder?: () => void
  onManageTemplates?: () => void
  onOpenSettings?: () => void
  onViewHistory?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

const QuickActions = React.forwardRef<HTMLDivElement, QuickActionsProps>(
  (
    {
      className,
      onOpenWatchFolder,
      onManageTemplates,
      onOpenSettings,
      onViewHistory,
      onRefresh,
      isRefreshing,
      ...props
    },
    ref
  ) => {
    const actions: QuickAction[] = [
      {
        id: "watch-folder",
        label: "Watch Folder",
        description: "Open the audio drop folder",
        icon: FolderOpen,
        onClick: () => onOpenWatchFolder?.(),
        variant: "outline",
      },
      {
        id: "templates",
        label: "Templates",
        description: "Manage note templates",
        icon: FileText,
        onClick: () => onManageTemplates?.(),
        variant: "outline",
      },
      {
        id: "history",
        label: "History",
        description: "View session history",
        icon: History,
        onClick: () => onViewHistory?.(),
        variant: "outline",
      },
      {
        id: "settings",
        label: "Settings",
        description: "Configure application",
        icon: Settings,
        onClick: () => onOpenSettings?.(),
        variant: "ghost",
      },
    ]

    return (
      <Card ref={ref} className={cn("", className)} data-testid="quick-actions" {...props}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              data-testid="refresh-button"
            >
              <RefreshCw
                className={cn("h-4 w-4", isRefreshing && "animate-spin")}
              />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <Button
                  key={action.id}
                  variant={action.variant}
                  size="sm"
                  onClick={action.onClick}
                  className="gap-2"
                  data-testid={`quick-action-${action.id}`}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }
)
QuickActions.displayName = "QuickActions"

export { QuickActions }
