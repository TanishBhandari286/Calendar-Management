"""
AI Planner Agent — powered by Gemini 2.0 Flash with function calling.

Handles:
- Loading per-user conversation history from SQLite
- Running the Gemini tool-calling loop
- Persisting updated history back to SQLite
"""

import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import google.generativeai as genai

from config import get_settings
from models import User, GoogleToken, ChatMessage
from agent.calendar_tools import make_calendar_tools

settings = get_settings()

# Configure Gemini globally
genai.configure(api_key=settings.gemini_api_key)

SYSTEM_PROMPT = """You are an intelligent personal planning assistant with access to the user's Google Calendar.
You help users manage their schedule through natural conversation.

Current date and time: {now}
User's timezone: Asia/Kolkata (IST, UTC+5:30)

Your capabilities:
- Create calendar events from natural language (e.g., "schedule DSA study 3-4pm tomorrow")
- List and query events in any date range
- Update existing events (time, title, description)
- Delete events by reference (e.g., "cancel the last event", "delete my meeting tomorrow")
- Analyze time spent (e.g., "how many hours did I study DSA this week?")
- Check if time slots are free before booking

CONFLICT DETECTION RULES (critical — follow every time):
1. Whenever a user wants to create an event at a specific time, ALWAYS call check_slot_availability FIRST.
2. If the slot is busy, tell the user which events conflict and suggest 3 alternative time slots nearby.
3. Only proceed to create the event if the slot is free OR the user explicitly says to proceed anyway.
4. Example: User says "book gym at 5pm" → call check_slot_availability("...T17:00:00+05:30", "...T18:00:00+05:30") first.

GOAL TRACKING:
- When a user mentions a weekly goal (e.g., "I want to study 10 hours of DSA"), acknowledge it and encourage them to set it in the dashboard.
- When asked about goal progress, use get_events_summary to calculate current hours.
- Be encouraging and give specific feedback like "You've hit 60% of your DSA goal — 4 more hours to go!"

Important rules:
- Always confirm what action you performed after executing a calendar operation
- When the user refers to "the last event", "my last booking", etc., use the most recently created event from conversation context
- For relative dates like "today", "tomorrow", "this week", compute them based on the current datetime above
- Format event times in a human-friendly way in your responses (e.g., "3:00 PM - 4:00 PM")
- Be concise, friendly, and proactive — suggest improvements when relevant
- If a calendar operation fails, explain the error clearly and suggest a fix
"""

HISTORY_LIMIT = 20  # last N messages to keep in context


async def load_history(user_id: int, db: AsyncSession) -> list[dict]:
    """Load the last N messages for a user from SQLite."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id)
        .order_by(ChatMessage.timestamp.desc())
        .limit(HISTORY_LIMIT)
    )
    messages = result.scalars().all()
    messages = list(reversed(messages))  # chronological order

    history = []
    for msg in messages:
        history.append({"role": msg.role, "parts": [{"text": msg.content}]})
    return history


async def save_message(user_id: int, role: str, content: str, db: AsyncSession):
    """Persist a chat message to SQLite."""
    msg = ChatMessage(user_id=user_id, role=role, content=content)
    db.add(msg)
    await db.flush()


async def run_agent(user_message: str, user: User, db: AsyncSession) -> str:
    """
    Main agent entry point.
    1. Load user's Google token + chat history
    2. Build calendar tools scoped to this user
    3. Run Gemini with tool-calling loop
    4. Save messages and return final response
    """

    # Load Google tokens
    result = await db.execute(select(GoogleToken).where(GoogleToken.user_id == user.id))
    google_token = result.scalar_one_or_none()

    if not google_token:
        return "❌ Your Google Calendar is not connected. Please log in again to grant calendar access."

    # Build user-scoped calendar tools
    tools = make_calendar_tools(
        access_token=google_token.access_token,
        refresh_token=google_token.refresh_token,
        token_expiry=google_token.token_expiry,
    )

    # Build a dispatch map for tool execution
    tool_dispatch = {fn.__name__: fn for fn in tools}

    # Load conversation history
    history = await load_history(user.id, db)

    # Build the system prompt with current time
    now_str = datetime.now(timezone.utc).astimezone().strftime("%A, %B %d, %Y %I:%M %p %Z")
    system_instruction = SYSTEM_PROMPT.format(now=now_str)

    # Initialize Gemini model with tools
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=system_instruction,
        tools=tools,
    )

    # Start chat with existing history
    chat = model.start_chat(history=history)

    # Send the user message
    await save_message(user.id, "user", user_message, db)

    try:
        response = await chat.send_message_async(user_message)

        # Tool-calling loop
        max_iterations = 5
        iteration = 0
        while iteration < max_iterations:
            iteration += 1
            candidate = response.candidates[0]
            parts = candidate.content.parts

            # Check if there's a function call in the response
            function_calls = [p for p in parts if hasattr(p, "function_call") and p.function_call.name]

            if not function_calls:
                # No more tool calls — we have the final text response
                break

            # Execute all function calls in this turn
            tool_results = []
            for part in function_calls:
                fc = part.function_call
                fn_name = fc.name
                fn_args = dict(fc.args) if fc.args else {}

                # Execute the tool
                if fn_name in tool_dispatch:
                    try:
                        result_text = tool_dispatch[fn_name](**fn_args)
                    except Exception as e:
                        result_text = f"Error executing {fn_name}: {str(e)}"
                else:
                    result_text = f"Unknown tool: {fn_name}"

                tool_results.append(
                    genai.protos.Part(
                        function_response=genai.protos.FunctionResponse(
                            name=fn_name,
                            response={"result": result_text},
                        )
                    )
                )

            # Send tool results back to the model
            response = await chat.send_message_async(tool_results)

        # Extract final text response
        final_text = ""
        for part in response.candidates[0].content.parts:
            if hasattr(part, "text") and part.text:
                final_text += part.text

        if not final_text:
            final_text = "✅ Done! The calendar operation was completed successfully."

        # Save assistant response
        await save_message(user.id, "model", final_text, db)
        await db.commit()

        return final_text

    except Exception as e:
        error_msg = f"❌ I encountered an error: {str(e)}"
        await save_message(user.id, "model", error_msg, db)
        await db.commit()
        return error_msg
