"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"

import {
  type GoogleCalendarEvent,
  getEventColors,
} from "@/modules/google/calendar/services/google-calendar-services"
import { CalendarRowActions } from "./calendar-row-actions"
import { dateRangeFilterFn } from "./filter-fns"

function getEventColor(colorId: string | undefined): string {
  if (!colorId) return "#7986CB"
  return getEventColors()[colorId]?.background ?? "#7986CB"
}

function formatDateTime(iso: string): string {
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

interface CalendarColumnActions {
  onRefresh?: () => void
  onDeleted?: () => void
}

export function getCalendarColumns({
  onRefresh,
  onDeleted,
}: CalendarColumnActions = {}): ColumnDef<GoogleCalendarEvent>[] {
  return [
    {
      id: "rowNumber",
      header: "#",
      size: 50,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.index + 1}</span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "summary",
      header: "Tiêu đề",
      cell: ({ row }) => {
        const colorId = row.original.colorId
        const color = getEventColor(colorId)
        return (
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="truncate font-medium max-w-[300px]">
              {row.getValue("summary")}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "start",
      header: "Bắt đầu",
      filterFn: (row, _id, value: string) =>
        dateRangeFilterFn(
          row,
          "start",
          value as Parameters<typeof dateRangeFilterFn>[2],
          (_addMeta) => {}
        ),
      cell: ({ row }) => (
        <span className="text-sm">{formatDateTime(row.getValue("start"))}</span>
      ),
    },
    {
      accessorKey: "end",
      header: "Kết thúc",
      cell: ({ row }) => (
        <span className="text-sm">{formatDateTime(row.getValue("end"))}</span>
      ),
    },
    {
      accessorKey: "location",
      header: "Địa điểm",
      cell: ({ row }) => {
        const location = row.getValue("location") as string | undefined
        return (
          <span className="text-sm text-muted-foreground">
            {location || "—"}
          </span>
        )
      },
    },
    {
      accessorKey: "attendeesCount",
      header: "Người tham dự",
      cell: ({ row }) => {
        const count = row.getValue("attendeesCount") as number
        if (count === 0)
          return <span className="text-sm text-muted-foreground">—</span>
        return (
          <Badge variant="secondary" className="text-xs">
            {count} người
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <CalendarRowActions row={row} onDeleted={onDeleted} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ]
}
