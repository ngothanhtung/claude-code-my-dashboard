import { getFirestoreCollection, getFirestoreDocumentCollection } from "@/lib/firebase/firestore-query"
import { calendars, eventDates, events } from "./calendar-mock-data"
import { type CalendarEvent } from "./types/calendar-types"
import type { Calendar } from "./types/calendar-types"

type FirestoreDateLike = Date | string | { toDate: () => Date }

type StoredCalendarEvent = Omit<CalendarEvent, "date"> & {
  date: FirestoreDateLike
}

type StoredEventDate = {
  date: FirestoreDateLike
  count: number
}

function normalizeDate(date: FirestoreDateLike) {
  if (date instanceof Date) {
    return date
  }

  if (typeof date === "string") {
    return new Date(date)
  }

  return date.toDate()
}

export async function getCalendarData() {
  const [storedEvents, storedEventDates, storedCalendars] = await Promise.all([
    getFirestoreCollection<StoredCalendarEvent>("events", events),
    getFirestoreDocumentCollection<StoredEventDate>("eventDates", eventDates),
    getFirestoreCollection<Calendar>("calendars", calendars),
  ])

  return {
    events: storedEvents.map((event) => ({
      ...event,
      date: normalizeDate(event.date),
    })),
    eventDates: storedEventDates.map((eventDate) => ({
      ...eventDate,
      date: normalizeDate(eventDate.date),
    })),
    calendars: storedCalendars,
  }
}
