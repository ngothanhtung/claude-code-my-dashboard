import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

/** Shared OAuth2 client factory */
function createOAuth2Client(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

/** GET /api/google/calendar/events — list events or get colors */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.endsWith("/colors")) {
    try {
      const accessToken =
        request.headers.get("x-access-token") ||
        url.searchParams.get("accessToken");
      if (!accessToken) {
        return NextResponse.json({ error: "Missing access token" }, { status: 401 });
      }
      const oauth2Client = createOAuth2Client(accessToken);
      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const colorsResponse = await calendar.colors.get({});
      return NextResponse.json({
        success: true,
        event: colorsResponse.data.event || {},
      });
    } catch (error) {
      console.error("[Google Calendar Colors Error]", error);
      return NextResponse.json({ error: "Failed to get colors" }, { status: 500 });
    }
  }

  // Fall through to events list
  try {
    const accessToken =
      request.headers.get("x-access-token") ||
      url.searchParams.get("accessToken");
    if (!accessToken) {
      return NextResponse.json({ success: false, error: "Missing access token" }, { status: 401 });
    }

    const oauth2Client = createOAuth2Client(accessToken);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const now = new Date().toISOString();

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: now,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 100,
    });

    const events = (response.data.items || []).map((item) => ({
      id: item.id || "",
      summary: item.summary || "(No title)",
      start: item.start?.dateTime || item.start?.date || "",
      end: item.end?.dateTime || item.end?.date || "",
      description: item.description || undefined,
      location: item.location || undefined,
      attendeesCount: (item.attendees || []).length,
      attendees: (item.attendees || []).map((a) => a.email || "").filter(Boolean),
      colorId: item.colorId || undefined,
      htmlLink: item.htmlLink || undefined,
    }));

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error("[Google Calendar List Error]", error);
    return NextResponse.json({ success: false, error: "Lỗi khi lấy danh sách sự kiện" }, { status: 500 });
  }
}

interface CreateEventRequest {
  accessToken: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  timeZone?: string;
  location?: string;
  attendees?: string[];
  colorId?: string;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken, eventId, summary, description, start, end, timeZone, location, attendees, colorId } = body

    if (!accessToken || !eventId) {
      return NextResponse.json({ success: false, error: "Missing accessToken or eventId" }, { status: 400 })
    }

    const oauth2Client = createOAuth2Client(accessToken)
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    const patchBody: Record<string, unknown> = {}
    if (summary !== undefined) patchBody.summary = summary
    if (description !== undefined) patchBody.description = description
    if (location !== undefined) patchBody.location = location
    if (colorId !== undefined) patchBody.colorId = colorId
    if (start !== undefined) patchBody.start = { dateTime: start, timeZone }
    if (end !== undefined) patchBody.end = { dateTime: end, timeZone }
    if (attendees !== undefined) {
      patchBody.attendees = attendees.map((email: string) => ({ email }))
    }

    await calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: patchBody,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Google Calendar PATCH Error]", error)
    return NextResponse.json({ success: false, error: "Lỗi khi cập nhật sự kiện" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const eventId = url.searchParams.get("eventId")
    const accessToken = request.headers.get("x-access-token") || url.searchParams.get("accessToken")

    if (!accessToken || !eventId) {
      return NextResponse.json({ success: false, error: "Missing accessToken or eventId" }, { status: 400 })
    }

    const oauth2Client = createOAuth2Client(accessToken)
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Google Calendar DELETE Error]", error)
    return NextResponse.json({ success: false, error: "Lỗi khi xóa sự kiện" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateEventRequest = await request.json();

    const { accessToken, summary, start, end } = body;

    if (!accessToken || !summary || !start || !end) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: accessToken, summary, start, and end are required",
        },
        { status: 400 }
      );
    }

    const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
    if (!dateTimeRegex.test(start) || !dateTimeRegex.test(end)) {
      return NextResponse.json(
        { success: false, error: "Định dạng ngày giờ không hợp lệ" },
        { status: 400 }
      );
    }

    const oauth2Client = createOAuth2Client(accessToken);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const eventBody: {
      summary: string;
      description?: string;
      start: { dateTime: string; timeZone?: string };
      end: { dateTime: string; timeZone?: string };
      colorId?: string;
      location?: string;
      attendees?: { email: string }[];
      reminders?: { useDefault: boolean; overrides?: { method: string; minutes: number }[] };
    } = {
      summary: body.summary,
      start: {
        dateTime: start,
        timeZone: body.timeZone,
      },
      end: {
        dateTime: end,
        timeZone: body.timeZone,
      },
    };

    if (body.description) {
      eventBody.description = body.description;
    }

    if (body.colorId) {
      eventBody.colorId = body.colorId;
    } else {
      eventBody.colorId = "1";
    }

    if (body.location) {
      eventBody.location = body.location;
    }

    if (body.attendees && body.attendees.length > 0) {
      eventBody.attendees = body.attendees.map((email) => ({ email }));
      eventBody.reminders = {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      };
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: eventBody,
    });

    return NextResponse.json({
      success: true,
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
    });
  } catch (error) {
    console.error("[Google Calendar API Error]", error);
    return NextResponse.json(
      { success: false, error: "Lỗi khi tạo sự kiện" },
      { status: 500 }
    );
  }
}
