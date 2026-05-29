# Google Calendar: Dialog + Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Google Calendar inline event creation form into a Dialog modal and add a filter toolbar (Date Range + Color) to the event list, matching the tasks page pattern.

**Architecture:** Two new components (`AddEventModal`, `EventListToolbar`) are created. The inline form card is removed from `page.tsx`. The `EventList` component is extended to render the toolbar and accept an `onAddEvent` callback. The filter toolbar uses Tanstack Table's `columnFilters` with custom filter functions for date range and color.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tanstack Table, Radix UI Dialog, date-fns, Zod, shadcn/ui

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/modules/google/calendar/components/add-event-modal.tsx` | Create | Dialog-based event creation form |
| `src/modules/google/calendar/components/event-list-toolbar.tsx` | Create | Two-row filter toolbar |
| `src/modules/google/calendar/components/event-list.tsx` | Modify | Accept `onAddEvent`, render toolbar, remove old toolbar |
| `src/app/(private)/google/calendar/page.tsx` | Modify | Remove inline form card, pass callbacks to EventList |

---

## Task 1: Create `AddEventModal` component

**Files:**
- Create: `src/modules/google/calendar/components/add-event-modal.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client"

import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Calendar,
  Clock,
  FileText,
  MapPin,
  Users,
} from "lucide-react"
import {
  createCalendarEvent,
  isConnected,
  type CreateEventPayload,
} from "@/modules/google/calendar/services/google-calendar-services"

const TIMEZONE_OPTIONS = [
  { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (UTC+7)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+7)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+9)" },
  { value: "America/New_York", label: "America/New_York (UTC-5)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (UTC-8)" },
  { value: "Europe/London", label: "Europe/London (UTC+0)" },
  { value: "UTC", label: "UTC" },
]

const EVENT_COLORS = [
  { id: "blue", value: "1", hex: "#4285F4" },
  { id: "green", value: "2", hex: "#0F9D58" },
  { id: "red", value: "3", hex: "#DB4437" },
  { id: "orange", value: "4", hex: "#F4B400" },
  { id: "purple", value: "5", hex: "#9C27B0" },
  { id: "pink", value: "6", hex: "#E91E63" },
] as const

const isAuthError = (msg: string) =>
  /unauthorized|invalid credentials|token/i.test(msg ?? "")

const formSchema = z
  .object({
    summary: z.string().min(1, "Tiêu đề là bắt buộc"),
    description: z.string().optional(),
    start: z.string().min(1, "Thời gian bắt đầu là bắt buộc"),
    end: z.string().min(1, "Thời gian kết thúc là bắt buộc"),
    timeZone: z.string().min(1),
    location: z.string().optional(),
    colorId: z.string().optional(),
  })
  .refine(
    (data) => !data.start || !data.end || new Date(data.start) < new Date(data.end),
    { message: "Thời gian kết thúc phải sau thời gian bắt đầu", path: ["end"] }
  )

type FormData = z.infer<typeof formSchema>

interface AddEventModalProps {
  onAddEvent?: () => void
  trigger?: React.ReactNode
}

const initialState: FormData & { attendees: string[] } = {
  summary: "",
  description: "",
  start: "",
  end: "",
  timeZone: "Asia/Ho_Chi_Minh",
  location: "",
  attendees: [],
  colorId: "1",
}

export function AddEventModal({ onAddEvent, trigger }: AddEventModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [attendeesInput, setAttendeesInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAttendeeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const value = attendeesInput.trim()
      if (value && value.includes("@")) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (emailRegex.test(value)) {
          if (!formData.attendees.includes(value)) {
            setFormData((prev) => ({ ...prev, attendees: [...prev.attendees, value] }))
          }
          setAttendeesInput("")
        } else {
          toast.error("Email không hợp lệ")
        }
      } else {
        toast.error("Vui lòng nhập địa chỉ email hợp lệ (phải chứa @)")
      }
    } else if (e.key === "Backspace" && attendeesInput === "" && formData.attendees.length > 0) {
      setFormData((prev) => ({ ...prev, attendees: prev.attendees.slice(0, -1) }))
    }
  }

  const removeAttendee = (email: string) => {
    setFormData((prev) => ({ ...prev, attendees: prev.attendees.filter((t) => t !== email) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected()) {
      toast.error("Vui lòng kết nối Google Calendar trước")
      return
    }
    setIsSubmitting(true)
    try {
      formSchema.parse(formData)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0] as string] = issue.message
          }
        })
        setErrors(newErrors)
      }
      setIsSubmitting(false)
      return
    }

    try {
      const payload: CreateEventPayload = {
        summary: formData.summary,
        description: formData.description,
        start: new Date(formData.start).toISOString(),
        end: new Date(formData.end).toISOString(),
        timeZone: formData.timeZone,
        location: formData.location,
        attendees: formData.attendees,
        colorId: formData.colorId,
      }

      const result = await createCalendarEvent(payload)

      if (result.success) {
        setFormData(initialState)
        setErrors({})
        setAttendeesInput("")
        if (result.htmlLink) {
          toast("Đã tạo event thành công", {
            action: { label: "Mở", onClick: () => window.open(result.htmlLink, "_blank") },
          })
        } else {
          toast.success("Đã tạo event thành công")
        }
        onAddEvent?.()
        setOpen(false)
      } else {
        const errorMsg = result.error ?? "Lỗi không xác định"
        if (isAuthError(errorMsg)) {
          toast.error("Phiên đăng nhập hết hạn. Vui lòng kết nối lại.")
        } else {
          toast.error(`Tạo event thất bại: ${errorMsg}`)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (isAuthError(msg)) {
        toast.error("Phiên đăng nhập hết hạn. Vui lòng kết nối lại.")
      } else {
        toast.error(`Tạo event thất bại: ${msg}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setFormData(initialState)
    setErrors({})
    setAttendeesInput("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" variant="default" size="sm" className="cursor-pointer">
            <Plus className="w-4 h-4" />
            Add Event
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new calendar event.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.root && <p className="text-sm text-destructive">{errors.root}</p>}

          {/* Tiêu đề */}
          <div className="space-y-1">
            <Label htmlFor="summary" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Tiêu đề <span className="text-destructive">*</span>
            </Label>
            <Input
              id="summary"
              placeholder="Ví dụ: Họp team sprint planning"
              value={formData.summary}
              onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
              className={errors.summary ? "border-red-500" : ""}
            />
            {errors.summary && <p className="text-sm text-destructive">{errors.summary}</p>}
          </div>

          {/* Mô tả */}
          <div className="space-y-1">
            <Label htmlFor="description" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Mô tả
            </Label>
            <Textarea
              id="description"
              placeholder="Mô tả chi tiết sự kiện..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Thời gian */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="start" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Bắt đầu <span className="text-destructive">*</span>
              </Label>
              <Input
                id="start"
                type="datetime-local"
                value={formData.start}
                onChange={(e) => setFormData((prev) => ({ ...prev, start: e.target.value }))}
                className={errors.start ? "border-red-500" : ""}
              />
              {errors.start && <p className="text-sm text-destructive">{errors.start}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="end" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Kết thúc <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end"
                type="datetime-local"
                value={formData.end}
                onChange={(e) => setFormData((prev) => ({ ...prev, end: e.target.value }))}
                className={errors.end ? "border-red-500" : ""}
              />
              {errors.end && <p className="text-sm text-destructive">{errors.end}</p>}
            </div>
          </div>

          {/* Múi giờ */}
          <div className="space-y-1">
            <Label htmlFor="timeZone" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Múi giờ
            </Label>
            <Select
              value={formData.timeZone}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, timeZone: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Địa điểm */}
          <div className="space-y-1">
            <Label htmlFor="location" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Địa điểm
            </Label>
            <Input
              id="location"
              placeholder="Ví dụ: Phòng họp A hoặc https://meet.google.com/abc-defg-hij"
              value={formData.location}
              onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
            />
          </div>

          {/* Người tham dự */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Người tham dự
            </Label>
            <div className="min-h-10.5 flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              {formData.attendees.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeAttendee(email)}
                    className="ml-0.5 rounded-sm hover:bg-primary/20 focus:outline-none"
                  >
                    &times;
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={attendeesInput}
                onChange={(e) => setAttendeesInput(e.target.value)}
                onKeyDown={handleAttendeeKeyDown}
                placeholder={
                  formData.attendees.length === 0 ? "Nhập email và nhấn Enter..." : ""
                }
                className="min-w-32 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Nhấn Enter hoặc dấu phẩy sau email để thêm
            </p>
          </div>

          {/* Màu sự kiện */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Màu sự kiện
            </Label>
            <div className="flex gap-3">
              {EVENT_COLORS.map((color) => (
                <label
                  key={color.id}
                  className="cursor-pointer"
                  title={color.id.charAt(0).toUpperCase() + color.id.slice(1)}
                >
                  <input
                    type="radio"
                    value={color.value}
                    className="sr-only"
                    checked={formData.colorId === color.value}
                    onChange={() => setFormData((prev) => ({ ...prev, colorId: color.value }))}
                  />
                  <span
                    className={`block h-6 w-6 rounded-full border-2 transition-transform ${
                      formData.colorId === color.value
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Đang tạo..." : "Create Event"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Verify imports are correct**

Check that all imports resolve:
- `@/modules/google/calendar/services/google-calendar-services` exports `createCalendarEvent`, `isConnected`, `CreateEventPayload`
- `@/components/ui/dialog` exports `Dialog`, `DialogContent`, `DialogDescription`, `DialogHeader`, `DialogTitle`, `DialogTrigger`
- All other imports should match existing component paths

- [ ] **Step 3: Commit**

```bash
git add src/modules/google/calendar/components/add-event-modal.tsx
git commit -m "feat(google-calendar): add AddEventModal dialog component"
```

---

## Task 2: Create `EventListToolbar` component

**Files:**
- Create: `src/modules/google/calendar/components/event-list-toolbar.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client"

import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { RefreshCcw } from "lucide-react"
import { isSameDay, isSameMonth, startOfWeek, endOfWeek } from "date-fns"

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

const DATE_RANGE_OPTIONS = [
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

type DateRangeFilter = "all" | "today" | "this-week" | "this-month"

function dateRangeFilterFn(
  row: { getValue: (id: string) => unknown },
  columnId: string,
  filterValue: DateRangeFilter
) {
  if (filterValue === "all") return true
  const eventStart = new Date(row.getValue<string>(columnId))
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

interface EventListToolbarProps {
  table: Table<GoogleCalendarEvent>
  onAddEvent?: () => void
}

export function EventListToolbar({ table, onAddEvent }: EventListToolbarProps) {
  const isFiltered = table.getState().columnFilters.length > 0

  const dateRangeFilter = table.getColumn("start")?.getFilterValue() as DateRangeFilter | undefined
  const colorFilter = table.getColumn("colorId")?.getFilterValue() as string | undefined

  const handleDateRangeChange = (value: string) => {
    const column = table.getColumn("start")
    if (value === "all") {
      column?.setFilterValue(undefined)
    } else {
      column?.setFilterValue(value as DateRangeFilter)
    }
  }

  const handleColorChange = (value: string) => {
    const column = table.getColumn("colorId")
    if (value === "all") {
      column?.setFilterValue(undefined)
    } else {
      column?.setFilterValue(value)
    }
  }

  const handleReset = () => {
    table.resetColumnFilters()
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Filter Dropdowns */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Select
          value={dateRangeFilter || "all"}
          onValueChange={handleDateRangeChange}
        >
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={colorFilter || "all"}
          onValueChange={handleColorChange}
        >
          <SelectTrigger className="w-full cursor-pointer">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
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
            onClick={handleReset}
            className="cursor-pointer"
            disabled={!isFiltered}
          >
            <RefreshCcw className="h-4 w-4" />
            <span className="hidden lg:block">Reset Filters</span>
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
```

- [ ] **Step 2: Register filter function with Tanstack Table**

The `EventList` component (Task 3) registers `dateRangeFilterFn` on the `start` column. This toolbar just calls `column.setFilterValue()`.

- [ ] **Step 3: Commit**

```bash
git add src/modules/google/calendar/components/event-list-toolbar.tsx
git commit -m "feat(google-calendar): add EventListToolbar with date range and color filters"
```

---

## Task 3: Update `EventList` component

**Files:**
- Modify: `src/modules/google/calendar/components/event-list.tsx`

- [ ] **Step 1: Add filter function import and `onAddEvent` prop**

Add to imports (from `@tanstack/react-table`):
```ts
import type { FilterFn } from "@tanstack/react-table"
```

Import the toolbar and filter function:
```ts
import { EventListToolbar } from "./event-list-toolbar"
import type { GoogleCalendarEvent } from "@/modules/google/calendar/services/google-calendar-services"
```

Add `dateRangeFilterFn` from `EventListToolbar` — export it from `event-list-toolbar.tsx` first, then import it here. Alternatively, define it in this file and export.

**Best approach:** Move `dateRangeFilterFn` to a shared `filter-fns.ts` file, then import it in both toolbar and event-list.

- [ ] **Step 1b: Create `src/modules/google/calendar/components/filter-fns.ts`**

```ts
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
```

Then in `EventListToolbar`, replace the inline function with:
```ts
import { dateRangeFilterFn } from "./filter-fns"
```

And in `EventList`, register it on the `start` column.

- [ ] **Step 2: Update `EventListProps` interface**

Add `onAddEvent` prop:
```ts
interface EventListProps {
  columns: ColumnDef<GoogleCalendarEvent, unknown>[]
  data: GoogleCalendarEvent[]
  onRefresh: () => void
  isLoading?: boolean
  onAddEvent?: () => void
}
```

Update destructuring:
```ts
export function EventList({
  columns,
  data,
  onRefresh,
  isLoading,
  onAddEvent,
}: EventListProps) {
```

- [ ] **Step 3: Register custom filter function on the `start` column**

In the `useReactTable` call, add `filterFns`:
```ts
const table = useReactTable({
  // ... existing config ...
  filterFns: {
    dateRange: dateRangeFilterFn,
  },
})
```

Then in the column definition for `start`, add the filter function. Check `columns.tsx` for the `start` column definition — add `filterFn: "dateRange"` to it. If the column uses a custom accessor, ensure the filter function can read `row.original.start`.

**Note:** Tanstack Table filter functions receive `row` and `columnId`. For `filterFn: "dateRange"` to work, the column must be registered with `filterFn: "dateRange"` in the column definition in `columns.tsx`. Alternatively, register a custom filter function on the column explicitly.

The cleanest approach: in `columns.tsx`, find the `start` column def and add:
```ts
filterFn: (row, _columnId, filterValue) => dateRangeFilterFn(row, "start", filterValue)
```

Or simply add `filterFn: "dateRange"` and make sure the column's accessor returns the date string directly (it already does).

- [ ] **Step 4: Replace old toolbar with `EventListToolbar`**

Remove the old toolbar div (lines 91-131 in the original file — the `div` with `Input`, `RefreshCw` Button, and page-size Select). Replace it with:
```tsx
<EventListToolbar table={table} onAddEvent={onAddEvent} />
```

Keep the `pageSize` selector — move it into `EventListToolbar` or keep it below the toolbar. The cleanest: keep it in the toolbar as part of the right-side actions, OR add it as a third row. The simplest approach matching the tasks pattern: keep the page-size selector in `EventListToolbar` right side (next to AddEventModal). Or keep it in `EventList` below the toolbar.

**Decision:** Move the page-size `Select` into `EventListToolbar` Row 2 right side, alongside `DataTableViewOptions` and `AddEventModal`. This matches the tasks pattern where DataTableViewOptions is in the toolbar.

- [ ] **Step 5: Verify the changes compile**

Run: `npm run build` (or `npx tsc --noEmit`) to check for type errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/google/calendar/components/event-list.tsx
git add src/modules/google/calendar/components/filter-fns.ts
git commit -m "refactor(google-calendar): update EventList to use EventListToolbar with filters"
```

---

## Task 4: Update `page.tsx` — Remove inline form

**Files:**
- Modify: `src/app/(private)/google/calendar/page.tsx`

- [ ] **Step 1: Remove form-related imports and state**

Remove from imports:
```ts
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
```

These imports are only used by the form. Check the file — some may still be needed elsewhere.

Remove from component body:
- `const [submitting, setSubmitting] = useState(false)` — only used by form
- `const [attendeesInput, setAttendeesInput] = useState("")` — only used by form
- `const [attendeeTags, setAttendeeTags] = useState<string[]>([])` — only used by form
- `const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<FormValues>(...)` — entire useForm call
- `const selectedColor = useWatch({ control, name: "colorId" })` — useWatch
- `const handleAttendeeKeyDown` callback
- `const removeAttendee` callback
- `const onSubmit` callback
- `formSchema` and `FormValues` type (if not used elsewhere)
- `TIMEZONE_OPTIONS` (move to `AddEventModal` — already there)
- `EVENT_COLORS` (move to `AddEventModal` — already there)
- `isAuthError` (move to `AddEventModal` — already there)

- [ ] **Step 2: Remove `handleDisconnect` form cleanup**

Update `handleDisconnect` to no longer call `reset()` or clear `attendeeTags`. Only call `clearToken()` and set state.

- [ ] **Step 3: Remove the form Card from JSX**

Remove the entire `<Card>` block at the bottom (lines 471-685) containing the `Tạo sự kiện mới` form. Keep the `</div>` closure of the desktop view container.

- [ ] **Step 4: Pass `onAddEvent` to `EventList`**

Update the `EventList` component usage:
```tsx
<EventList
  columns={getCalendarColumns({ onRefresh: refreshEvents })}
  data={events}
  onRefresh={refreshEvents}
  onAddEvent={refreshEvents}
  isLoading={loadingEvents}
/>
```

- [ ] **Step 5: Verify the page compiles**

Run: `npm run build` to check for errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(private\)/google/calendar/page.tsx
git commit -m "refactor(google-calendar): remove inline form, pass onAddEvent to EventList"
```

---

## Task 5: Verify end-to-end

- [ ] **Step 1: Start dev server and test**

Run: `npm run dev`

Open http://localhost:3000/google/calendar

- [ ] **Step 2: Test filter toolbar**

Connect Google Calendar. Verify the filter toolbar appears with Date Range and Color dropdowns. Test each filter option — "Today", "This Week", "This Month", color filter.

- [ ] **Step 3: Test "Add Event" button and dialog**

Click "Add Event" — dialog should open. Fill in fields and submit. Verify event is created and appears in the list.

- [ ] **Step 4: Test Reset Filters**

Apply filters, click Reset — verify all filters clear.

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "feat(google-calendar): dialog-based event creation with date/color filters"
```

---

## Spec Coverage Check

| Spec Section | Task |
|---|---|
| New files: AddEventModal | Task 1 |
| New files: EventListToolbar | Task 2 |
| Filter bar two-row layout | Task 2 |
| Date Range filter (Today/This Week/This Month/All) | Task 2 + Task 3 |
| Color filter | Task 2 + Task 3 |
| Search + Reset + DataTableViewOptions + AddEvent button | Task 2 |
| AddEventModal Dialog structure | Task 1 |
| Form fields (all 8 fields) | Task 1 |
| Form state useState + Zod | Task 1 |
| Page: remove inline form card | Task 4 |
| Page: pass onAddEvent callback | Task 4 |
| date-fns dependency (already present) | — |
