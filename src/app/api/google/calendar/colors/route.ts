import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";

function createOAuth2Client(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI
  );
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

/** GET /api/google/calendar/colors — get Google Calendar event color definitions */
export async function GET(request: NextRequest) {
  try {
    const accessToken =
      request.headers.get("x-access-token") ||
      new URL(request.url).searchParams.get("accessToken");

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
