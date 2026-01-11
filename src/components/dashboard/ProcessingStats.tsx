import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { cn } from "~/lib/utils"
import {
  Mic,
  Brain,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock
} from "lucide-react"
import type { SessionStatus } from "./StatusBadge"

export interface ProcessingStatsData {
  pending: number
  transcribing: number
  mapping: number
  gaps_detected: number
  completed: number
  failed: number
}

export interface ProcessingStatsProps extends React.HTMLAttributes<HTMLDivElement> {
  stats: ProcessingStatsData
}

interface StatItem {
  label: string
  key: keyof ProcessingStatsData
  icon: React.ElementType
  colorClass: string
}

const statItems: StatItem[] = [
  {
    label: "Pending",
    key: "pending",
    icon: Clock,
    colorClass: "text-yellow-600 dark:text-yellow-400",
  },
  {
    label: "Transcribing",
    key: "transcribing",
    icon: Mic,
    colorClass: "text-blue-600 dark:text-blue-400",
  },
  {
    label: "AI Processing",
    key: "mapping",
    icon: Brain,
    colorClass: "text-purple-600 dark:text-purple-400",
  },
  {
    label: "Needs Input",
    key: "gaps_detected",
    icon: HelpCircle,
    colorClass: "text-orange-600 dark:text-orange-400",
  },
  {
    label: "Completed",
    key: "completed",
    icon: CheckCircle2,
    colorClass: "text-green-600 dark:text-green-400",
  },
  {
    label: "Failed",
    key: "failed",
    icon: AlertCircle,
    colorClass: "text-red-600 dark:text-red-400",
  },
]

const ProcessingStats = React.forwardRef<HTMLDivElement, ProcessingStatsProps>(
  ({ className, stats, ...props }, ref) => {
    // Calculate total active (in-progress) items
    const activeCount = stats.transcribing + stats.mapping
    const totalCount = Object.values(stats).reduce((a, b) => a + b, 0)

    return (
      <Card ref={ref} className={cn("", className)} data-testid="processing-stats" {...props}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Processing Status</span>
            {activeCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {activeCount} active
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {statItems.map((item) => {
              const Icon = item.icon
              const count = stats[item.key]
              return (
                <div
                  key={item.key}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50"
                  data-testid={`stat-${item.key}`}
                >
                  <Icon className={cn("h-4 w-4", item.colorClass)} />
                  <span className="text-xl font-semibold tabular-nums">
                    {count}
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    {item.label}
                  </span>
                </div>
              )
            })}
          </div>
          {totalCount === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              No sessions yet
            </p>
          )}
        </CardContent>
      </Card>
    )
  }
)
ProcessingStats.displayName = "ProcessingStats"

// Helper to calculate stats from sessions
export function calculateStatsFromSessions(
  sessions: { status: SessionStatus }[]
): ProcessingStatsData {
  const stats: ProcessingStatsData = {
    pending: 0,
    transcribing: 0,
    mapping: 0,
    gaps_detected: 0,
    completed: 0,
    failed: 0,
  }

  sessions.forEach((session) => {
    switch (session.status) {
      case "pending":
        stats.pending++
        break
      case "transcribing":
        stats.transcribing++
        break
      case "transcribed":
      case "mapping":
      case "completing":
        stats.mapping++
        break
      case "gaps_detected":
        stats.gaps_detected++
        break
      case "completed":
        stats.completed++
        break
      case "failed":
        stats.failed++
        break
    }
  })

  return stats
}

export { ProcessingStats }
