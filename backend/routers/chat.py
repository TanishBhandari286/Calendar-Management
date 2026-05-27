from pydantic import BaseModel
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, ChatMessage
from auth.jwt_handler import get_current_user
from agent.planner_agent import run_agent

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


class MessageOut(BaseModel):
    role: str
    content: str
    timestamp: str


@router.post("", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message to the AI planner and get a response."""
    if not body.message.strip():
        return ChatResponse(response="Please enter a message.")

    response_text = await run_agent(
        user_message=body.message.strip(),
        user=current_user,
        db=db,
    )
    return ChatResponse(response=response_text)


@router.get("/history", response_model=list[MessageOut])
async def get_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    """Fetch the chat history for the current user."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.timestamp.asc())
        .limit(limit)
    )
    messages = result.scalars().all()
    return [
        MessageOut(
            role=msg.role,
            content=msg.content,
            timestamp=msg.timestamp.isoformat(),
        )
        for msg in messages
    ]


@router.delete("/history")
async def clear_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Clear all chat history for the current user."""
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.user_id == current_user.id)
    )
    messages = result.scalars().all()
    for msg in messages:
        await db.delete(msg)
    await db.commit()
    return {"message": "Chat history cleared."}
