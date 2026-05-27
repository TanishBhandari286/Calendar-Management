"""
Goals router — CRUD for user weekly goals + progress calculation.

Progress is computed by fetching Google Calendar events this week
and summing durations of events whose title contains the goal keyword.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, UserGoal, GoogleToken
from auth.jwt_handler import get_current_user
from agent.calendar_tools import _build_calendar_service

router = APIRouter(prefix="/goals", tags=["goals"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    name: str
    keyword: str
    target_hours: float = 10.0
    color: str = "#FF453A"
    emoji: str = "📚"


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    keyword: Optional[str] = None
    target_hours: Optional[float] = None
    color: Optional[str] = None
    emoji: Optional[str] = None


class GoalOut(BaseModel):
    id: int
    name: str
    keyword: str
    target_hours: float
    color: str
    emoji: str

    class Config:
        from_attributes = True


class GoalProgress(GoalOut):
    current_hours: float
    percentage: float
    events_count: int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _week_bounds():
    """Return (monday 00:00, sunday 23:59:59) for the current week in IST."""
    now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    monday = now - timedelta(days=now.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    sunday = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
    # Format as ISO with IST offset
    ist_offset = "+05:30"
    start = monday.strftime(f"%Y-%m-%dT%H:%M:%S{ist_offset}")
    end = sunday.strftime(f"%Y-%m-%dT%H:%M:%S{ist_offset}")
    return start, end


def _calc_hours(events: list, keyword: str) -> tuple[float, int]:
    """Sum durations of events whose summary contains keyword (case-insensitive)."""
    kw = keyword.lower()
    total_minutes = 0
    count = 0
    for ev in events:
        title = ev.get("summary", "").lower()
        if kw in title:
            start_str = ev["start"].get("dateTime")
            end_str = ev["end"].get("dateTime")
            if start_str and end_str:
                try:
                    start_dt = datetime.fromisoformat(start_str)
                    end_dt = datetime.fromisoformat(end_str)
                    total_minutes += (end_dt - start_dt).total_seconds() / 60
                    count += 1
                except Exception:
                    pass
    return round(total_minutes / 60, 2), count


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[GoalOut])
async def list_goals(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserGoal).where(UserGoal.user_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/", response_model=GoalOut, status_code=201)
async def create_goal(
    body: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = UserGoal(user_id=current_user.id, **body.model_dump())
    db.add(goal)
    await db.flush()
    await db.refresh(goal)
    return goal


@router.put("/{goal_id}", response_model=GoalOut)
async def update_goal(
    goal_id: int,
    body: GoalUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserGoal).where(UserGoal.id == goal_id, UserGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(goal, field, value)
    await db.flush()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserGoal).where(UserGoal.id == goal_id, UserGoal.user_id == current_user.id)
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)


@router.get("/progress", response_model=list[GoalProgress])
async def get_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns each goal with current week's progress calculated from Google Calendar.
    """
    # Load goals
    result = await db.execute(
        select(UserGoal).where(UserGoal.user_id == current_user.id)
    )
    goals = result.scalars().all()
    if not goals:
        return []

    # Load Google token
    token_result = await db.execute(
        select(GoogleToken).where(GoogleToken.user_id == current_user.id)
    )
    google_token = token_result.scalar_one_or_none()
    if not google_token:
        raise HTTPException(status_code=400, detail="Google Calendar not connected")

    # Fetch this week's events once
    try:
        service = _build_calendar_service(
            google_token.access_token,
            google_token.refresh_token,
            google_token.token_expiry,
        )
        start, end = _week_bounds()
        events_result = service.events().list(
            calendarId="primary",
            timeMin=start,
            timeMax=end,
            maxResults=250,
            singleEvents=True,
            orderBy="startTime",
        ).execute()
        week_events = events_result.get("items", [])
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google Calendar error: {str(e)}")

    # Calculate progress per goal
    progress_list = []
    for goal in goals:
        current_hours, count = _calc_hours(week_events, goal.keyword)
        pct = min(round((current_hours / goal.target_hours) * 100, 1), 100.0) if goal.target_hours > 0 else 0
        progress_list.append(GoalProgress(
            id=goal.id,
            name=goal.name,
            keyword=goal.keyword,
            target_hours=goal.target_hours,
            color=goal.color,
            emoji=goal.emoji,
            current_hours=current_hours,
            percentage=pct,
            events_count=count,
        ))

    return progress_list
