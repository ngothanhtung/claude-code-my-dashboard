import type { FilterFn } from "@tanstack/react-table"
import { isSameDay, isSameMonth, startOfWeek, endOfWeek } from "date-fns"

import type { GoogleCalendarEvent } from "@/modules/google/calendar/services/google-calendar-services"

export type DateRangeFilter = "all" | "today" | "this-week" | "this-month"

export const dateRangeFilterFn: FilterFn<GoogleCalendarEvent> = (
  row,
  _columnId,
  filterValue: DateRangeFilter,
  _addMeta
) => {
  if (filterValue === "all") return true
  const eventStart = new Date(row.getValue<string>("start"))
  const now = new Date()
  switch (filterValue) {
    case "today":
      return isSameDay(eventStart, now)
    case "this-week":
      return eventStart >= startOfWeek(now) && eventStart <= endOfWeek(now)
    case "this-month":
      return isSameMonth(eventStart, now)
    default:
      return true
  }
}
dateRangeFilterFn.autoRemove = (val: DateRangeFilter) => val === "all"
