# Google Calendar Event Form Implementation Plan

**Goal:** Tạo trang `/google/calendar` với form tạo event, lưu vào Google Calendar qua OAuth2 popup.

**Architecture:** Client component dùng Google Identity Services (GIS) để lấy access token qua popup, gửi form data lên Next.js API route, route dùng `googleapis` server-side để gọi Calendar API.

**Tech Stack:** Next.js App Router, Google Identity Services, googleapis, React Hook Form + Zod, shadcn/ui components.

---

## File Structure

```
src/app/(private)/google/calendar/page.tsx          ← Trang chính
src/app/api/google/calendar/events/route.ts         ← API route tạo event
src/modules/google/calendar/services/
  google-calendar-services.ts                        ← OAuth2 utilities + API calls
```

---

## Task 1: Create Google Calendar Service

**Files:**
- Create: `src/modules/google/calendar/services/google-calendar-services.ts`

```typescript
// src/modules/google/calendar/services/google-calendar-services.ts

const GIS_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID!
const GIS_SCOPES = "https://www.googleapis.com/auth/calendar.events"

const STORAGE_KEY = "gcal_access_token"
const TOKEN_EXPIRY_KEY = "gcal_token_expiry"

export function saveToken(accessToken: string, expiresAt: number) {
  localStorage.setItem(STORAGE_KEY, accessToken)
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(expiresAt))
}

export function getToken(): string | null {
  const token = localStorage.getItem(STORAGE_KEY)
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY)
  if (!token || !expiry) return null
  if (Date.now() > Number(expiry)) {
    clearToken()
    return null
  }
  return token
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(TOKEN_EXPIRY_KEY)
}

export function isConnected(): boolean {
  return getToken() !== null
}

export interface CreateEventPayload {
  summary: string
  description?: string
  start: string       // ISO 8601
  end: string         // ISO 8601
  timeZone: string
  location?: string
  attendees?: string[]
  colorId?: string
}

export async function createCalendarEvent(payload: CreateEventPayload): Promise<{
  success: boolean
  eventId?: string
  htmlLink?: string
  error?: string
}> {
  const token = getToken()
  if (!token) {
    return { success: false, error: "Chưa kết nối Google Calendar" }
  }

  const res = await fetch("/api/google/calendar/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: token, ...payload }),
  })

  const data = await res.json()
  if (!res.ok) {
    return { success: false, error: data.error || "Lỗi không xác định" }
  }
  return data
}

export function requestGoogleAuth(): Promise<{ accessToken: string; expiresAt: number }> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google Identity Services chưa load"))
      return
    }

    // @ts-ignore
    window.google.accounts.oauth2.initTokenClient({
      client_id: GIS_CLIENT_ID,
      scope: GIS_SCOPES,
      callback: (response: { access_token?: string; expires_in?: number; error?: string }) => {
        if (response.error) {
          reject(new Error(response.error))
        } else {
          const expiresAt = Date.now() + (response.expires_in! * 1000)
          saveToken(response.access_token!, expiresAt)
          resolve({ accessToken: response.access_token!, expiresAt })
        }
      },
    }).requestAccessToken()
  })
}
```

- [ ] **Step 1: Create directory structure**

Run: `mkdir -p src/modules/google/calendar/services`

- [ ] **Step 2: Write google-calendar-services.ts**

Write the file above.

- [ ] **Step 3: Commit**

```bash
git add src/modules/google/calendar/services/google-calendar-services.ts
git commit -m "feat(google-calendar): add OAuth2 and API service layer"
```

---

## Task 2: Create API Route

**Files:**
- Create: `src/app/api/google/calendar/events/route.ts`

```typescript
// src/app/api/google/calendar/events/route.ts

import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      accessToken,
      summary,
      description,
      start,
      end,
      timeZone,
      location,
      attendees,
      colorId,
    } = body

    if (!accessToken || !summary || !start || !end) {
      return NextResponse.json(
        { success: false, error: "Thiếu trường bắt buộc" },
        { status: 400 }
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:3000"
    )

    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    const event: Record<string, unknown> = {
      summary,
      description,
      start: { dateTime: start, timeZone },
      end: { dateTime: end, timeZone },
      colorId: colorId || "1",
    }

    if (location) {
      event.location = location
    }

    if (attendees && attendees.length > 0) {
      event.attendees = attendees.map((email: string) => ({ email }))
      event.reminders = {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      }
    }

    const result = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    })

    return NextResponse.json({
      success: true,
      eventId: result.data.id,
      htmlLink: result.data.htmlLink,
    })
  } catch (err) {
    console.error("Google Calendar API error:", err)
    const message = err instanceof Error ? err.message : "Lỗi không xác định"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
```

- [ ] **Step 1: Create directory structure**

Run: `mkdir -p src/app/api/google/calendar/events`

- [ ] **Step 2: Write route.ts**

Write the file above.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/google/calendar/events/route.ts
git commit -m "feat(google-calendar): add API route for creating calendar events"
```

---

## Task 3: Create Google Calendar Page

**Files:**
- Create: `src/app/(private)/google/calendar/page.tsx`

```tsx
// src/app/(private)/google/calendar/page.tsx

"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { Calendar, MapPin, Users, Clock, FileText, Plus, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  requestGoogleAuth,
  createCalendarEvent,
  clearToken,
  getToken,
} from "@/modules/google/calendar/services/google-calendar-services"

const eventSchema = z.object({
  summary: z.string().min(1, "Tiêu đề không được để trống"),
  description: z.string().optional(),
  start: z.string().min(1, "Ngày bắt đầu không được để trống"),
  end: z.string().min(1, "Ngày kết thúc không được để trống"),
  location: z.string().optional(),
  timeZone: z.string().default("Asia/Ho_Chi_Minh"),
  attendees: z.string().optional(),
  colorId: z.string().default("1"),
})

type EventFormValues = z.infer<typeof eventSchema>

const COLOR_OPTIONS = [
  { id: "1", label: "Xanh dương", value: "#4285F4" },
  { id: "2", label: "Xanh lá", value: "#0F9D58" },
  { id: "4", label: "Đỏ", value: "#DB4437" },
  { id: "5", label: "Cam", value: "#F4B400" },
  { id: "7", label: "Tím", value: "#9C27B0" },
  { id: "9", label: "Hồng", value: "#E91E63" },
]

export default function GoogleCalendarPage() {
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attendees, setAttendees] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      timeZone: "Asia/Ho_Chi_Minh",
      colorId: "1",
    },
  })

  useEffect(() => {
    setIsConnected(getToken() !== null)

    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      await requestGoogleAuth()
      setIsConnected(true)
      toast.success("Đã kết nối Google Calendar!")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi kết nối"
      if (msg !== "popup_closed_by_user") {
        toast.error(`Kết nối thất bại: ${msg}`)
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = () => {
    clearToken()
    setIsConnected(false)
    reset()
    setAttendees([])
    toast.info("Đã ngắt kết nối Google Calendar")
  }

  const addAttendee = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      const input = e.currentTarget.value.trim()
      if (input && input.includes("@") && !attendees.includes(input)) {
        setAttendees([...attendees, input])
        setValue("attendees", [...attendees, input].join(","))
        e.currentTarget.value = ""
      } else if (input && !input.includes("@")) {
        toast.error("Email không hợp lệ")
      }
    }
  }

  const removeAttendee = (email: string) => {
    const updated = attendees.filter((a) => a !== email)
    setAttendees(updated)
    setValue("attendees", updated.join(","))
  }

  const onSubmit = async (data: EventFormValues) => {
    setIsSubmitting(true)
    try {
      const payload = {
        summary: data.summary,
        description: data.description,
        start: data.start,
        end: data.end,
        timeZone: data.timeZone,
        location: data.location,
        attendees: data.attendees ? data.attendees.split(",").map((e) => e.trim()).filter(Boolean) : [],
        colorId: data.colorId,
      }

      const result = await createCalendarEvent(payload)

      if (result.success) {
        toast.success("Event đã được tạo trên Google Calendar!")
        reset()
        setAttendees([])
        if (result.htmlLink) {
          toast("Đã mở event trong Google Calendar", {
            action: {
              label: "Mở",
              onClick: () => window.open(result.htmlLink, "_blank"),
            },
          })
        }
      } else {
        if (result.error?.includes("Invalid credentials") || result.error?.includes("unauthorized")) {
          clearToken()
          setIsConnected(false)
          toast.error("Token hết hạn, vui lòng kết nối lại")
        } else {
          toast.error(result.error || "Tạo event thất bại")
        }
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="px-4 lg:px-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tạo Event Google Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Tạo sự kiện mới trên Google Calendar của bạn
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        {/* Connection status */}
        <div className="flex items-center justify-between rounded-md bg-muted/50 px-4 py-3 mb-6">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-yellow-500"}`}
            />
            <span className="text-sm font-medium">
              {isConnected ? "Đã kết nối Google Calendar" : "Chưa kết nối"}
            </span>
          </div>
          {isConnected ? (
            <Button variant="outline" size="sm" onClick={handleDisconnect}>
              <LogOut className="mr-2 h-4 w-4" />
              Ngắt kết nối
            </Button>
          ) : (
            <Button size="sm" onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Kết nối Google
            </Button>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="summary">
              Tiêu đề <span className="text-destructive">*</span>
            </Label>
            <Input
              id="summary"
              placeholder="Ví dụ: Họp team sprint planning"
              disabled={!isConnected}
              {...register("summary")}
            />
            {errors.summary && (
              <p className="text-xs text-destructive">{errors.summary.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              <FileText className="inline mr-1 h-3 w-3" />
              Mô tả
            </Label>
            <Textarea
              id="description"
              placeholder="Mô tả chi tiết sự kiện..."
              rows={3}
              disabled={!isConnected}
              {...register("description")}
            />
          </div>

          {/* Date/Time row */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start">
                <Clock className="inline mr-1 h-3 w-3" />
                Bắt đầu <span className="text-destructive">*</span>
              </Label>
              <Input id="start" type="datetime-local" disabled={!isConnected} {...register("start")} />
              {errors.start && (
                <p className="text-xs text-destructive">{errors.start.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">
                <Clock className="inline mr-1 h-3 w-3" />
                Kết thúc <span className="text-destructive">*</span>
              </Label>
              <Input id="end" type="datetime-local" disabled={!isConnected} {...register("end")} />
              {errors.end && (
                <p className="text-xs text-destructive">{errors.end.message}</p>
              )}
            </div>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timeZone">Múi giờ</Label>
            <select
              id="timeZone"
              disabled={!isConnected}
              {...register("timeZone")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
              <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
              <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
              <option value="America/New_York">America/New_York (GMT-5)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (GMT-8)</option>
              <option value="Europe/London">Europe/London (GMT+0)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">
              <MapPin className="inline mr-1 h-3 w-3" />
              Địa điểm
            </Label>
            <Input
              id="location"
              placeholder="Ví dụ: Phòng họp A, Hà Nội"
              disabled={!isConnected}
              {...register("location")}
            />
          </div>

          {/* Attendees */}
          <div className="space-y-2">
            <Label>
              <Users className="inline mr-1 h-3 w-3" />
              Người tham dự
            </Label>
            <Input
              placeholder="Nhấn Enter để thêm email..."
              disabled={!isConnected}
              onKeyDown={addAttendee}
            />
            {attendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attendees.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => removeAttendee(email)}
                      className="hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Màu sự kiện</Label>
            <div className="flex gap-3">
              {COLOR_OPTIONS.map((color) => (
                <label key={color.id} className="cursor-pointer">
                  <input
                    type="radio"
                    value={color.id}
                    {...register("colorId")}
                    className="sr-only"
                  />
                  <div
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      watch("colorId") === color.id
                        ? "border-foreground scale-110"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={!isConnected || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Tạo Event
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 1: Create directory structure**

Run: `mkdir -p "src/app/(private)/google/calendar"`

- [ ] **Step 2: Write page.tsx**

Write the file above.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(private)/google/calendar/page.tsx"
git commit -m "feat(google-calendar): add event creation page with OAuth2 popup"
```

---

## Task 4: Add Sidebar Navigation Link

**Files:**
- Modify: `src/components/app-sidebar.tsx` (or wherever the sidebar nav links are defined)

Find the nav items array and add:

```tsx
{
  title: "Google Calendar",
  url: "/google/calendar",
  icon: CalendarIcon,
}
```

- [ ] **Step 1: Find sidebar nav definition**

Grep for the nav items array in `src/components/app-sidebar.tsx` or similar.

- [ ] **Step 2: Add Google Calendar nav item**

Add the nav link after the existing calendar entry.

- [ ] **Step 3: Commit**

```bash
git add src/components/app-sidebar.tsx
git commit -m "feat(sidebar): add Google Calendar nav link"
```

---

## Task 5: Verify

- [ ] **Start dev server**

Run: `npm run dev`

- [ ] **Navigate to `/google/calendar`**

Verify the page loads, shows connection status, and the form is disabled until connected.

- [ ] **Test OAuth flow**

Click "Kết nối Google", verify GIS popup appears, approve, verify token saved and form enabled.

- [ ] **Test form submission**

Fill form, submit, verify event appears in Google Calendar.

- [ ] **Test error handling**

Disconnect, try submitting → should show appropriate message.
