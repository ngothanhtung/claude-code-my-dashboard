/**
 * Google Calendar Service Layer
 * Client-side OAuth2 token management and API calls via internal Next.js route.
 */

const STORAGE_KEY_ACCESS_TOKEN = 'gcal_access_token';
const STORAGE_KEY_TOKEN_EXPIRY = 'gcal_token_expiry';

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/** ---------- Token Storage ---------- */

/**
 * Save the access token and its expiry timestamp to localStorage.
 */
export function saveToken(accessToken: string, expiresAt: number): void {
  localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, accessToken);
  localStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, JSON.stringify(expiresAt));
}

/**
 * Retrieve the raw access token from localStorage without any side effects.
 * Does not check or mutate expiry state.
 */
function _getRawToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
}

/**
 * Retrieve the access token from localStorage.
 * Returns null if the token is missing or has expired.
 */
export function getToken(): string | null {
  const accessToken = _getRawToken();
  const expiresAtRaw = localStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);

  if (!accessToken || !expiresAtRaw) {
    return null;
  }

  let expiresAt: number;
  try {
    expiresAt = JSON.parse(expiresAtRaw);
  } catch {
    clearToken();
    return null;
  }

  if (Date.now() >= expiresAt) {
    clearToken();
    return null;
  }

  return accessToken;
}

/**
 * Remove the access token and expiry from localStorage.
 */
export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
}

/**
 * Returns true if a non-expired access token is present in localStorage.
 * Does not mutate localStorage (does not call clearToken on expiry).
 */
export function isConnected(): boolean {
  const accessToken = _getRawToken();
  if (!accessToken) return false;

  const expiresAtRaw = localStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);
  if (!expiresAtRaw) return false;

  let expiresAt: number;
  try {
    expiresAt = JSON.parse(expiresAtRaw);
  } catch {
    return false;
  }

  return Date.now() < expiresAt;
}

/** ---------- Google Identity Services (GIS) ---------- */

/**
 * Initiates the Google OAuth2 consent flow using GIS.
 * Saves the obtained token to localStorage and returns it.
 *
 * Requires `NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID` to be set.
 * The GIS library must be loaded on the page (e.g. via script tag with
 * id="google-identity-services-library" and src="https://accounts.google.com/gsi/client").
 *
 * @throws Error if the GIS library is not loaded or the user denies consent.
 */
export async function requestGoogleAuth(): Promise<{ accessToken: string; expiresAt: number }> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;

  if (!clientId) {
    throw new Error(
      'NEXT_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID is not set. ' +
        'Please configure it in your environment variables.'
    );
  }

  if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
    throw new Error(
      'Google Identity Services library is not loaded. ' +
        'Ensure the script "https://accounts.google.com/gsi/client" is included in your page.'
    );
  }

  return new Promise((resolve, reject) => {
    // @ts-ignore — window.google is injected by the GIS script; no official @types package.
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_SCOPE,
      callback: (response: { access_token?: string; expires_in?: number; error?: string }) => {
        if (response.error) {
          reject(new Error(`Google OAuth error: ${response.error}`));
          return;
        }

        if (!response.access_token || !response.expires_in) {
          reject(new Error('Google OAuth response missing access_token or expires_in.'));
          return;
        }

        const expiresAt = Date.now() + response.expires_in * 1000;
        saveToken(response.access_token, expiresAt);
        resolve({ accessToken: response.access_token, expiresAt });
      },
    });

    client.requestAccessToken({ prompt: 'consent' });
  });
}

/** ---------- Calendar API ---------- */

/** Payload interface for creating a Google Calendar event. */
export interface CreateEventPayload {
  /** Event title. */
  summary: string;
  /** Optional event description (supports HTML if calendar allows). */
  description?: string;
  /** ISO 8601 datetime string for the event start. */
  start: string;
  /** ISO 8601 datetime string for the event end. */
  end: string;
  /** IANA timezone string (e.g. "Asia/Ho_Chi_Minh"). */
  timeZone: string;
  /** Optional physical or video meeting location. */
  location?: string;
  /** Optional list of attendee email addresses. */
  attendees?: string[];
  /** Optional Google Calendar color ID (1–11). */
  colorId?: string;
}

/**
 * Creates a Google Calendar event via the internal Next.js API route.
 * The route handler forwards the request to the Google Calendar API server-side.
 *
 * @param payload - Event details conforming to CreateEventPayload.
 * @throws Error if no token is found or the API call fails.
 */
export async function createCalendarEvent(
  payload: CreateEventPayload
): Promise<{ success: boolean; eventId?: string; htmlLink?: string; error?: string }> {
  const accessToken = getToken();

  if (!accessToken) {
    return {
      success: false,
      error: 'No access token found. Call requestGoogleAuth() to obtain one before creating an event.',
    };
  }

  const response = await fetch('/api/google/calendar/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, accessToken }),
  });

  if (!response.ok) {
    let message = `API error: ${response.status}`;
    try {
      const errorBody = await response.json();
      if (errorBody?.error) message = errorBody.error;
    } catch {
      // ignore JSON parse errors
    }
    return { success: false, error: message };
  }

  const data = await response.json();
  return { success: true, eventId: data.id, htmlLink: data.htmlLink };
}
