"""
Google Calendar CRUD tools for the Gemini AI agent.

Each function is registered as a Gemini tool. Gemini's function calling will
invoke these with structured arguments parsed from the user's natural language.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest

from config import get_settings

settings = get_settings()


def _build_calendar_service(access_token: str, refresh_token: str | None, token_expiry: datetime | None):
    """Build the Google Calendar API service from stored OAuth tokens."""
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret,
        scopes=settings.google_scopes,
    )

    # Refresh if expired
    if token_expiry and datetime.now(timezone.utc) >= token_expiry.replace(tzinfo=timezone.utc):
        creds.refresh(GoogleRequest())

    return build("calendar", "v3", credentials=creds)


def make_calendar_tools(access_token: str, refresh_token: str | None, token_expiry: datetime | None):
    """
    Factory: returns a list of calendar tool functions bound to the user's credentials.
    Call this once per request to get user-scoped tools.
    """

    def create_calendar_event(
        summary: str,
        start_datetime: str,
        end_datetime: str,
        description: Optional[str] = None,
        location: Optional[str] = None,
    ) -> str:
        """
        Create a new event in the user's primary Google Calendar.

        Args:
            summary: The title or name of the event (e.g., "DSA Study Session").
            start_datetime: Start date and time in ISO 8601 format (e.g., "2024-12-25T15:00:00+05:30").
            end_datetime: End date and time in ISO 8601 format (e.g., "2024-12-25T16:00:00+05:30").
            description: Optional description or notes for the event.
            location: Optional location of the event.

        Returns:
            A confirmation string with the event ID and link.
        """
        service = _build_calendar_service(access_token, refresh_token, token_expiry)
        body: dict = {
            "summary": summary,
            "start": {"dateTime": start_datetime, "timeZone": "Asia/Kolkata"},
            "end": {"dateTime": end_datetime, "timeZone": "Asia/Kolkata"},
        }
        if description:
            body["description"] = description
        if location:
            body["location"] = location

        event = service.events().insert(calendarId="primary", body=body).execute()
        return f"✅ Event created: '{summary}' | ID: {event['id']} | Link: {event.get('htmlLink', 'N/A')}"

    def list_calendar_events(
        start_date: str,
        end_date: str,
        query: Optional[str] = None,
        max_results: int = 20,
    ) -> str:
        """
        List events from the user's primary Google Calendar within a date range.

        Args:
            start_date: Start date in ISO 8601 format (e.g., "2024-12-25T00:00:00+05:30").
            end_date: End date in ISO 8601 format (e.g., "2024-12-31T23:59:59+05:30").
            query: Optional keyword to search event titles/descriptions.
            max_results: Maximum number of events to return (default 20).

        Returns:
            A formatted list of events with their IDs, titles, and times.
        """
        service = _build_calendar_service(access_token, refresh_token, token_expiry)
        kwargs: dict = {
            "calendarId": "primary",
            "timeMin": start_date,
            "timeMax": end_date,
            "maxResults": max_results,
            "singleEvents": True,
            "orderBy": "startTime",
        }
        if query:
            kwargs["q"] = query

        events_result = service.events().list(**kwargs).execute()
        events = events_result.get("items", [])

        if not events:
            return "No events found in the specified date range."

        lines = [f"Found {len(events)} event(s):"]
        for ev in events:
            start = ev["start"].get("dateTime", ev["start"].get("date", "?"))
            end = ev["end"].get("dateTime", ev["end"].get("date", "?"))
            lines.append(f"• [{ev['id']}] {ev.get('summary', 'No title')} | {start} → {end}")
        return "\n".join(lines)

    def get_events_summary(
        start_date: str,
        end_date: str,
        query: Optional[str] = None,
    ) -> str:
        """
        Calculate total time spent on events matching a query within a date range.
        Use this to answer questions like "how many hours did I study DSA this week?".

        Args:
            start_date: Start date in ISO 8601 format (e.g., "2024-12-23T00:00:00+05:30").
            end_date: End date in ISO 8601 format (e.g., "2024-12-29T23:59:59+05:30").
            query: Keyword to filter events (e.g., "DSA", "gym", "meeting").

        Returns:
            A summary with total hours and a breakdown of matching events.
        """
        service = _build_calendar_service(access_token, refresh_token, token_expiry)
        kwargs: dict = {
            "calendarId": "primary",
            "timeMin": start_date,
            "timeMax": end_date,
            "maxResults": 100,
            "singleEvents": True,
            "orderBy": "startTime",
        }
        if query:
            kwargs["q"] = query

        events_result = service.events().list(**kwargs).execute()
        events = events_result.get("items", [])

        if not events:
            return f"No events found matching '{query}' in the specified date range."

        total_minutes = 0
        lines = []
        for ev in events:
            start_str = ev["start"].get("dateTime")
            end_str = ev["end"].get("dateTime")
            if start_str and end_str:
                start_dt = datetime.fromisoformat(start_str)
                end_dt = datetime.fromisoformat(end_str)
                duration = int((end_dt - start_dt).total_seconds() / 60)
                total_minutes += duration
                lines.append(f"• {ev.get('summary', 'No title')}: {duration} min")

        total_hours = total_minutes / 60
        summary = f"Total time for '{query}': {total_hours:.1f} hours ({total_minutes} minutes)\n"
        summary += "\nBreakdown:\n" + "\n".join(lines)
        return summary

    def update_calendar_event(
        event_id: str,
        summary: Optional[str] = None,
        start_datetime: Optional[str] = None,
        end_datetime: Optional[str] = None,
        description: Optional[str] = None,
        location: Optional[str] = None,
    ) -> str:
        """
        Update an existing event in the user's primary Google Calendar.

        Args:
            event_id: The ID of the event to update (from list_calendar_events).
            summary: New title for the event (optional).
            start_datetime: New start time in ISO 8601 format (optional).
            end_datetime: New end time in ISO 8601 format (optional).
            description: New description (optional).
            location: New location (optional).

        Returns:
            A confirmation string with the updated event details.
        """
        service = _build_calendar_service(access_token, refresh_token, token_expiry)

        # Fetch existing event first
        event = service.events().get(calendarId="primary", eventId=event_id).execute()

        if summary:
            event["summary"] = summary
        if description is not None:
            event["description"] = description
        if location is not None:
            event["location"] = location
        if start_datetime:
            event["start"] = {"dateTime": start_datetime, "timeZone": "Asia/Kolkata"}
        if end_datetime:
            event["end"] = {"dateTime": end_datetime, "timeZone": "Asia/Kolkata"}

        updated = service.events().update(
            calendarId="primary", eventId=event_id, body=event
        ).execute()

        return f"✅ Event updated: '{updated.get('summary')}' | ID: {updated['id']}"

    def delete_calendar_event(event_id: str) -> str:
        """
        Delete an event from the user's primary Google Calendar.

        Args:
            event_id: The ID of the event to delete (from list_calendar_events).

        Returns:
            A confirmation string indicating the event was deleted.
        """
        service = _build_calendar_service(access_token, refresh_token, token_expiry)
        # Fetch title before deleting for confirmation message
        try:
            event = service.events().get(calendarId="primary", eventId=event_id).execute()
            title = event.get("summary", "Unknown event")
        except Exception:
            title = "Unknown event"

        service.events().delete(calendarId="primary", eventId=event_id).execute()
        return f"🗑️ Event deleted: '{title}' (ID: {event_id})"

    def check_slot_availability(
        start_datetime: str,
        end_datetime: str,
    ) -> str:
        """
        Check if a time slot is free in the user's Google Calendar before creating an event.
        ALWAYS call this before create_calendar_event when the user specifies a time.

        Args:
            start_datetime: Proposed start in ISO 8601 (e.g., "2024-12-25T15:00:00+05:30").
            end_datetime: Proposed end in ISO 8601 (e.g., "2024-12-25T16:00:00+05:30").

        Returns:
            A string indicating free/busy status and any conflicting events.
        """
        service = _build_calendar_service(access_token, refresh_token, token_expiry)
        events_result = service.events().list(
            calendarId="primary",
            timeMin=start_datetime,
            timeMax=end_datetime,
            singleEvents=True,
            orderBy="startTime",
        ).execute()
        conflicts = events_result.get("items", [])

        if not conflicts:
            return f"✅ Slot is FREE: {start_datetime} → {end_datetime}. You can create the event."

        lines = [f"⚠️ SLOT IS BUSY — {len(conflicts)} conflict(s) found:"]
        for ev in conflicts:
            s = ev["start"].get("dateTime", ev["start"].get("date", "?"))
            e = ev["end"].get("dateTime", ev["end"].get("date", "?"))
            lines.append(f"  • {ev.get('summary', 'Untitled')} | {s} → {e}")
        lines.append("Suggest alternative times or ask user how to proceed.")
        return "\n".join(lines)

    return [
        check_slot_availability,
        create_calendar_event,
        list_calendar_events,
        get_events_summary,
        update_calendar_event,
        delete_calendar_event,
    ]
