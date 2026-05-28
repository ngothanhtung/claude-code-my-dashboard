"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { ExternalLink } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import type { GoogleCalendarEvent } from "@/modules/google/calendar/services/google-calendar-services"
import { dateRangeFilterFn } from "./filter-fns"

const COLOR_MAP: Record<string, string> = {
  "1": "#4285F4",
  "2": "#0F9D58",
  "3": "#FBBC04",
  "4": "#DB4437",
  "5": "#F4B400",
  "6": "#0D904F",
  "7": "#9C27B0",
  "8": "#3F51B5",
  "9": "#E91E63",
  "10": "#00BCD4",
  "11": "#795548",
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
}

export function getCalendarColumns({
  onRefresh,
}: CalendarColumnActions = {}): ColumnDef<GoogleCalendarEvent>[] {
  return [
    {
      accessorKey: "summary",
      header: "Tiêu đề",
      cell: ({ row }) => {
        const colorId = row.original.colorId
        const color = colorId ? COLOR_MAP[colorId] : "#4285F4"
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
      filterFn: (row, _id, value: string) => dateRangeFilterFn(row, "start", value as Parameters<typeof dateRangeFilterFn>[2], (_addMeta) => {}),
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
        if (count === 0) return <span className="text-sm text-muted-foreground">—</span>
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
      cell: ({ row }) => {
        const htmlLink = row.original.htmlLink
        if (!htmlLink) return null
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => window.open(htmlLink, "_blank")}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )
      },
      enableSorting: false,
    },
  ]
}
