"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Calendar,
  Clock,
  LogOut,
  Loader2,
  CalendarDays,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  requestGoogleAuth,
  clearToken,
  isConnected,
  listCalendarEvents,
  type GoogleCalendarEvent,
} from "@/modules/google/calendar/services/google-calendar-services"
import { EventList } from "@/modules/google/calendar/components/event-list"
import { getCalendarColumns } from "@/modules/google/calendar/components/columns"

export default function GoogleCalendarPage() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  // Load GIS script
  useEffect(() => {
    const scriptId = "google-identity-services-library"
    if (document.getElementById(scriptId)) return
    const script = document.createElement("script")
    script.id = scriptId
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  // Check connection on mount
  useEffect(() => {
    setConnected(isConnected())
  }, [])

  const refreshEvents = useCallback(async () => {
    setLoadingEvents(true)
    const result = await listCalendarEvents()
    if (result.success && result.events) {
      setEvents(result.events)
    } else if (result.error && !result.error.includes("Chưa kết nối")) {
      toast.error(result.error)
    }
    setLoadingEvents(false)
  }, [])

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    try {
      await requestGoogleAuth()
      setConnected(true)
      toast.success("Đã kết nối Google Calendar thành công!")
      refreshEvents()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes("popup_closed_by_user")) {
        return
      }
      toast.error(`Kết nối thất bại: ${msg}`)
    } finally {
      setConnecting(false)
    }
  }, [refreshEvents])

  const handleDisconnect = useCallback(() => {
    clearToken()
    setConnected(false)
    setEvents([])
    toast.info("Đã ngắt kết nối Google Calendar")
  }, [])

  // Stats
  const now = new Date()
  const totalEvents = events.length
  const upcomingEvents = events.filter(
    (e) => new Date(e.start) > now
  ).length
  const todayEvents = events.filter((e) => {
    const d = new Date(e.start)
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  }).length

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col gap-2 px-4 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Google Calendar</h1>
        <p className="text-muted-foreground">
          Quản lý sự kiện trên Google Calendar của bạn
        </p>
      </div>

      {/* Connection Status */}
      <div className="px-4 md:px-6">
        <div className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connected ? "bg-green-500" : "bg-yellow-500"
                }`}
              />
              <span className="font-medium">
                {connected ? "Đã kết nối Google Calendar" : "Chưa kết nối"}
              </span>
            </div>
            <div className="flex gap-2">
              {connected ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={connecting}
                >
                  {connecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  Ngắt kết nối
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleConnect}
                  disabled={connecting}
                >
                  {connecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Kết nối Google
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile placeholder */}
      <div className="md:hidden px-4 md:px-6">
        <div className="flex items-center justify-center h-48 border rounded-lg bg-muted/20">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">
              Google Calendar Dashboard
            </h3>
            <p className="text-muted-foreground text-sm">
              Vui lòng sử dụng màn hình lớn hơn để xem đầy đủ giao diện.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden h-full flex-1 flex-col space-y-6 px-4 md:px-6 md:flex">
        {connected && (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">
                        Tổng sự kiện
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {totalEvents}
                        </span>
                      </div>
                    </div>
                    <div className="bg-secondary rounded-lg p-3">
                      <Calendar className="size-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">
                        Sự kiện sắp tới
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {upcomingEvents}
                        </span>
                      </div>
                    </div>
                    <div className="bg-secondary rounded-lg p-3">
                      <CalendarDays className="size-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">
                        Hôm nay
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold">
                          {todayEvents}
                        </span>
                      </div>
                    </div>
                    <div className="bg-secondary rounded-lg p-3">
                      <Clock className="size-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">
                        Đã kết nối
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <CheckCircle2 className="size-4 text-green-500" />
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                          OK
                        </span>
                      </div>
                    </div>
                    <div className="bg-secondary rounded-lg p-3">
                      <Calendar className="size-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Event List */}
            <Card>
              <CardHeader>
                <CardTitle>Danh sách sự kiện</CardTitle>
                <CardDescription>
                  Xem và quản lý các sự kiện trên Google Calendar
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EventList
                  columns={getCalendarColumns({ onRefresh: refreshEvents })}
                  data={events}
                  onRefresh={refreshEvents}
                  onAddEvent={refreshEvents}
                  isLoading={loadingEvents}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  )
}
