from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, GoogleToken
from auth.jwt_handler import get_current_user
from agent.calendar_tools import make_calendar_tools

router = APIRouter(prefix="/calendar", tags=["calendar"])


@router.get("/events")
async def list_events(
    days: int = Query(default=7, description="Number of days from today to fetch"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List upcoming calendar events for the sidebar widget."""
    result = await db.execute(select(GoogleToken).where(GoogleToken.user_id == current_user.id))
    google_token = result.scalar_one_or_none()

    if not google_token:
        return {"events": [], "error": "Google Calendar not connected"}

    tools = make_calendar_tools(
        access_token=google_token.access_token,
        refresh_token=google_token.refresh_token,
        token_expiry=google_token.token_expiry,
    )
    list_fn = {fn.__name__: fn for fn in tools}["list_calendar_events"]

    now = datetime.now(timezone.utc).astimezone()
    end = now + timedelta(days=days)

    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        from config import get_settings

        settings = get_settings()
        creds = Credentials(
            token=google_token.access_token,
            refresh_token=google_token.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.google_client_id,
            client_secret=settings.google_client_secret,
        )
        service = build("calendar", "v3", credentials=creds)

        events_result = service.events().list(
            calendarId="primary",
            timeMin=now.isoformat(),
            timeMax=end.isoformat(),
            maxResults=20,
            singleEvents=True,
            orderBy="startTime",
        ).execute()

        events = []
        for ev in events_result.get("items", []):
            events.append({
                "id": ev["id"],
                "summary": ev.get("summary", "No title"),
                "start": ev["start"].get("dateTime", ev["start"].get("date")),
                "end": ev["end"].get("dateTime", ev["end"].get("date")),
                "description": ev.get("description"),
                "htmlLink": ev.get("htmlLink"),
            })

        return {"events": events}

    except Exception as e:
        return {"events": [], "error": str(e)}
