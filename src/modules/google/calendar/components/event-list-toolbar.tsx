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


export function EventListToolbar({
  table,
  onAddEvent,
}: EventListToolbarProps) {
  const isFiltered = table.getState().columnFilters.length > 0

  const handleDateRangeChange = (value: DateRangeFilter) => {
    const column = table.getColumn("start")
    column?.setFilterValue(value === "all" ? undefined : value)
  }

  const dateRangeFilter = table.getColumn("start")?.getFilterValue() as
    | DateRangeFilter
    | undefined

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={dateRangeFilter ?? "all"}
        onValueChange={handleDateRangeChange}
      >
        <SelectTrigger className="w-[160px] cursor-pointer">
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
        <span className="hidden lg:block ml-1">Reset</span>
      </Button>

      <div className="flex items-center gap-2 ml-auto">
        <DataTableViewOptions table={table} />
        <AddEventModal onSave={onAddEvent} />
      </div>
    </div>
  )
}
