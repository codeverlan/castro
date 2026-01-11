import * as React from "react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Card, CardContent } from "~/components/ui/card"
import { cn } from "~/lib/utils"
import { Search, X, Filter, Calendar } from "lucide-react"

export interface HistoryFiltersProps extends React.HTMLAttributes<HTMLDivElement> {
  // Filter values
  dateFrom: string
  dateTo: string
  status: string
  templateType: string
  search: string
  // Available options
  templateTypes: string[]
  // Callbacks
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onStatusChange: (value: string) => void
  onTemplateTypeChange: (value: string) => void
  onSearchChange: (value: string) => void
  onClearFilters: () => void
  onApplyFilters: () => void
  // Loading state
  isLoading?: boolean
}

// Session status options matching the database enum
const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "transcribing", label: "Transcribing" },
  { value: "transcribed", label: "Transcribed" },
  { value: "mapping", label: "AI Processing" },
  { value: "gaps_detected", label: "Needs Input" },
  { value: "completing", label: "Finalizing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
]

const HistoryFilters = React.forwardRef<HTMLDivElement, HistoryFiltersProps>(
  (
    {
      className,
      dateFrom,
      dateTo,
      status,
      templateType,
      search,
      templateTypes,
      onDateFromChange,
      onDateToChange,
      onStatusChange,
      onTemplateTypeChange,
      onSearchChange,
      onClearFilters,
      onApplyFilters,
      isLoading,
      ...props
    },
    ref
  ) => {
    const hasActiveFilters = dateFrom || dateTo || status || templateType || search

    return (
      <Card ref={ref} className={cn("", className)} {...props}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Filters</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search recordings..."
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9"
                  data-testid="history-search-input"
                />
              </div>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="pl-9"
                  data-testid="history-date-from"
                />
              </div>
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="pl-9"
                  data-testid="history-date-to"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status || "all"} onValueChange={onStatusChange}>
                <SelectTrigger id="status" data-testid="history-status-select">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Type Filter */}
            <div className="space-y-2">
              <Label htmlFor="templateType">Template Type</Label>
              <Select value={templateType || "all"} onValueChange={onTemplateTypeChange}>
                <SelectTrigger id="templateType" data-testid="history-template-select">
                  <SelectValue placeholder="Select template type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  {templateTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                disabled={isLoading}
                data-testid="history-clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
            <Button
              size="sm"
              onClick={onApplyFilters}
              disabled={isLoading}
              data-testid="history-apply-filters"
            >
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
)
HistoryFilters.displayName = "HistoryFilters"

export { HistoryFilters }
