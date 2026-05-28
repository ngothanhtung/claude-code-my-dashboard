"use client"

import type { Table } from "@tanstack/react-table"
import { RefreshCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTableViewOptions } from "@/modules/tasks/components/data-table-view-options"
import { AddEventModal } from "./add-event-modal"
import type { GoogleCalendarEvent } from "@/modules/google/calendar/services/google-calendar-services"
import type { DateRangeFilter } from "./filter-fns"

interface EventListToolbarProps {
  table: Table<GoogleCalendarEvent>
  onAddEvent?: () => void
}

const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
]

const COLOR_OPTIONS = [
  { value: "all", label: "All Colors" },
  { value: "1", label: "Blue" },
  { value: "2", label: "Green" },
  { value: "3", label: "Red" },
  { value: "4", label: "Orange" },
  { value: "5", label: "Purple" },
  { value: "6", label: "Pink" },
]

export function EventListToolbar({
  table,
  onAddEvent,
}: EventListToolbarProps) {
  const isFiltered = table.getState().columnFilters.length > 0

  const handleDateRangeChange = (value: DateRangeFilter) => {
    const column = table.getColumn("start")
    column?.setFilterValue(value === "all" ? undefined : value)
  }

  const handleColorChange = (value: string) => {
    const column = table.getColumn("colorId")
    if (value === "all") {
      column?.setFilterValue(undefined)
    } else {
      column?.setFilterValue(value)
    }
  }

  const dateRangeFilter = table.getColumn("start")?.getFilterValue() as
    | DateRangeFilter
    | undefined
  const colorFilter = table.getColumn("colorId")?.getFilterValue() as
    | string
    | undefined

  return (
    <div className="space-y-4">
      {/* Row 1: Filters */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:max-w-md">
        {/* Date Range Filter */}
        <Select
          value={dateRangeFilter ?? "all"}
          onValueChange={handleDateRangeChange}
        >
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="cursor-pointer"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Color Filter */}
        <Select value={colorFilter ?? "all"} onValueChange={handleColorChange}>
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="cursor-pointer"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Search + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search events..."
            value={(table.getColumn("summary")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("summary")?.setFilterValue(event.target.value)
            }
            className="w-[200px] lg:w-[300px] cursor-text"
          />
          <Button
            variant="outline"
            onClick={() => table.resetColumnFilters()}
            className="px-3 cursor-pointer"
            disabled={!isFiltered}
          >
            <RefreshCcw className="h-4 w-4" />
            <span className="hidden lg:block">Reset</span>
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <DataTableViewOptions table={table} />
          <AddEventModal onAddEvent={onAddEvent} />
        </div>
      </div>
    </div>
  )
}
