import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "~/lib/utils"
import {
  Clock,
  Mic,
  FileText,
  Brain,
  AlertCircle,
  CheckCircle2,
  Loader2,
  HelpCircle
} from "lucide-react"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      status: {
        pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
        transcribing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
        transcribed: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
        mapping: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
        gaps_detected: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
        completing: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
        completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
        failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
)

// Session status type matching the database enum
export type SessionStatus =
  | "pending"
  | "transcribing"
  | "transcribed"
  | "mapping"
  | "gaps_detected"
  | "completing"
  | "completed"
  | "failed"

// Status configuration with labels and icons
const statusConfig: Record<SessionStatus, { label: string; icon: React.ElementType; animate?: boolean }> = {
  pending: { label: "Pending", icon: Clock },
  transcribing: { label: "Transcribing", icon: Mic, animate: true },
  transcribed: { label: "Transcribed", icon: FileText },
  mapping: { label: "AI Processing", icon: Brain, animate: true },
  gaps_detected: { label: "Needs Input", icon: HelpCircle },
  completing: { label: "Finalizing", icon: Loader2, animate: true },
  completed: { label: "Completed", icon: CheckCircle2 },
  failed: { label: "Failed", icon: AlertCircle },
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: SessionStatus
  showIcon?: boolean
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ className, status, showIcon = true, ...props }, ref) => {
    const config = statusConfig[status]
    const Icon = config.icon

    return (
      <div
        ref={ref}
        className={cn(statusBadgeVariants({ status }), className)}
        data-testid={`status-badge-${status}`}
        {...props}
      >
        {showIcon && (
          <Icon
            className={cn(
              "h-3 w-3",
              config.animate && "animate-pulse"
            )}
          />
        )}
        <span>{config.label}</span>
      </div>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

export { StatusBadge, statusBadgeVariants, statusConfig }
