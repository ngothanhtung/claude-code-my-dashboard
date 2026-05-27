import { z } from "zod"

export const googleCalendarEventSchema = z.object({
  id: z.string(),
  summary: z.string(),
  start: z.string(),
  end: z.string(),
  location: z.string().optional(),
  attendeesCount: z.number(),
  colorId: z.string().optional(),
  htmlLink: z.string().optional(),
})

export type GoogleCalendarEvent = z.infer<typeof googleCalendarEventSchema>
