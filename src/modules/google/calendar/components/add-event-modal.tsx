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
