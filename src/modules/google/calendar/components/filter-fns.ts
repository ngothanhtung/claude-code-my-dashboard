import type { FilterFn } from "@tanstack/react-table"
import { isSameDay, isSameMonth, startOfWeek, endOfWeek } from "date-fns"

export type DateRangeFilter = "all" | "today" | "this-week" | "this-month"

export const dateRangeFilterFn: FilterFn<{ start: string }> = (
  row,
  _columnId,
  filterValue: DateRangeFilter
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
