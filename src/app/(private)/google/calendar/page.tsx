"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  FileText,
  Plus,
  LogOut,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  requestGoogleAuth,
  clearToken,
  isConnected,
  createCalendarEvent,
  type CreateEventPayload,
} from "@/modules/google/calendar/services/google-calendar-services";

const isAuthError = (msg: string) =>
  /unauthorized|invalid credentials|token/i.test(msg ?? "");

const TIMEZONE_OPTIONS = [
  { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (UTC+7)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (UTC+7)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (UTC+8)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+9)" },
  { value: "America/New_York", label: "America/New_York (UTC-5)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (UTC-8)" },
  { value: "Europe/London", label: "Europe/London (UTC+0)" },
  { value: "UTC", label: "UTC" },
];

const EVENT_COLORS = [
  { id: "blue", value: "1", hex: "#4285F4" },
  { id: "green", value: "2", hex: "#0F9D58" },
  { id: "red", value: "3", hex: "#DB4437" },
  { id: "orange", value: "4", hex: "#F4B400" },
  { id: "purple", value: "5", hex: "#9C27B0" },
  { id: "pink", value: "6", hex: "#E91E63" },
] as const;

const formSchema = z
  .object({
    summary: z.string().min(1, "Tiêu đề là bắt buộc"),
    description: z.string().optional(),
    start: z.string().min(1, "Thời gian bắt đầu là bắt buộc"),
    end: z.string().min(1, "Thời gian kết thúc là bắt buộc"),
    timeZone: z.string().min(1),
    location: z.string().optional(),
    attendees: z.array(z.string().email("Email không hợp lệ")).optional(),
    colorId: z.string().optional(),
  })
  .refine((data) => !data.start || !data.end || new Date(data.start) < new Date(data.end), {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu",
    path: ["end"],
  });

type FormValues = z.infer<typeof formSchema>;

export default function GoogleCalendarPage() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendeesInput, setAttendeesInput] = useState("");
  const [attendeeTags, setAttendeeTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      summary: "",
      description: "",
      start: "",
      end: "",
      timeZone: "Asia/Ho_Chi_Minh",
      location: "",
      colorId: "blue",
    },
  });

  const selectedColor = useWatch({ control, name: "colorId" });

  // Load GIS script
  useEffect(() => {
    const scriptId = "google-identity-services-library";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // Check connection on mount
  useEffect(() => {
    setConnected(isConnected());
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      await requestGoogleAuth();
      setConnected(true);
      toast.success("Đã kết nối Google Calendar thành công!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("popup_closed_by_user")) {
        // silently ignore
        return;
      }
      toast.error(`Kết nối thất bại: ${msg}`);
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    clearToken();
    setConnected(false);
    setAttendeeTags([]);
    reset();
    toast.info("Đã ngắt kết nối Google Calendar");
  }, [reset]);

  const handleAttendeeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const value = attendeesInput.trim();
        if (value && value.includes("@")) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (emailRegex.test(value)) {
            if (!attendeeTags.includes(value)) {
              const updated = [...attendeeTags, value];
              setAttendeeTags(updated);
              setValue("attendees", updated);
            }
            setAttendeesInput("");
          } else {
            toast.error("Email không hợp lệ");
          }
        } else {
          toast.error("Vui lòng nhập địa chỉ email hợp lệ (phải chứa @)");
        }
      } else if (e.key === "Backspace" && attendeesInput === "" && attendeeTags.length > 0) {
        const updated = attendeeTags.slice(0, -1);
        setAttendeeTags(updated);
        setValue("attendees", updated);
      }
    },
    [attendeesInput, attendeeTags, setValue]
  );

  const removeAttendee = useCallback(
    (email: string) => {
      const updated = attendeeTags.filter((t) => t !== email);
      setAttendeeTags(updated);
      setValue("attendees", updated);
    },
    [setValue]
  );

  const onSubmit = useCallback(
    async (data: FormValues) => {
      if (!connected) {
        toast.error("Vui lòng kết nối Google Calendar trước");
        return;
      }

      setSubmitting(true);
      try {
        const payload: CreateEventPayload = {
          summary: data.summary,
          description: data.description,
          start: new Date(data.start).toISOString(),
          end: new Date(data.end).toISOString(),
          timeZone: data.timeZone,
          location: data.location,
          attendees: attendeeTags,
          colorId: data.colorId,
        };

        const result = await createCalendarEvent(payload);

        if (result.success) {
          reset();
          setAttendeeTags([]);
          setAttendeesInput("");
          if (result.htmlLink) {
            toast("Đã tạo event thành công", {
              action: {
                label: "Mở",
                onClick: () => window.open(result.htmlLink, "_blank"),
              },
            });
          }
        } else {
          const errorMsg = result.error ?? "Lỗi không xác định";
          if (isAuthError(errorMsg)) {
            handleDisconnect();
            toast.error("Phiên đăng nhập hết hạn. Vui lòng kết nối lại.");
          } else {
            toast.error(`Tạo event thất bại: ${errorMsg}`);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isAuthError(msg)) {
          handleDisconnect();
          toast.error("Phiên đăng nhập hết hạn. Vui lòng kết nối lại.");
        } else {
          toast.error(`Tạo event thất bại: ${msg}`);
        }
      } finally {
        setSubmitting(false);
      }
    },
    [connected, reset, handleDisconnect]
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Google Calendar</h1>
          <p className="text-sm text-muted-foreground">Tạo sự kiện trên Google Calendar</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-green-500" : "bg-yellow-500"}`}
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
                {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                Ngắt kết nối
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Kết nối Google
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Event Creation Form */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Tạo sự kiện mới</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Tiêu đề */}
          <div className="space-y-1">
            <Label htmlFor="summary" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Tiêu đề <span className="text-destructive">*</span>
            </Label>
            <Input
              id="summary"
              placeholder="Ví dụ: Họp team sprint planning"
              disabled={!connected}
              {...register("summary")}
            />
            {errors.summary && (
              <p className="text-sm text-destructive">{errors.summary.message}</p>
            )}
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
              disabled={!connected}
              rows={3}
              {...register("description")}
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
                disabled={!connected}
                {...register("start")}
              />
              {errors.start && (
                <p className="text-sm text-destructive">{errors.start.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="end" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Kết thúc <span className="text-destructive">*</span>
              </Label>
              <Input
                id="end"
                type="datetime-local"
                disabled={!connected}
                {...register("end")}
              />
              {errors.end && (
                <p className="text-sm text-destructive">{errors.end.message}</p>
              )}
            </div>
          </div>

          {/* Múi giờ */}
          <div className="space-y-1">
            <Label htmlFor="timeZone" className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Múi giờ
            </Label>
            <Select
              value={useWatch({ control, name: "timeZone" })}
              onValueChange={(value) => setValue("timeZone", value)}
              disabled={!connected}
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
              disabled={!connected}
              {...register("location")}
            />
          </div>

          {/* Người tham dự */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Người tham dự
            </Label>
            <div
              className={`min-h-[42px] flex flex-wrap gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                !connected ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              {attendeeTags.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeAttendee(email)}
                    disabled={!connected}
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
                placeholder={attendeeTags.length === 0 ? "Nhập email và nhấn Enter..." : ""}
                disabled={!connected}
                className="min-w-32 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
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
                    disabled={!connected}
                    {...register("colorId")}
                  />
                  <span
                    className={`block h-6 w-6 rounded-full border-2 transition-transform ${
                      selectedColor === color.value
                        ? "scale-110 border-foreground"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.hex }}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={!connected || submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {submitting ? "Đang tạo..." : "Tạo Event"}
          </Button>
        </form>
      </div>
    </div>
  );
}
