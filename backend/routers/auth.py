import secrets
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import User, GoogleToken
from auth.google_oauth import get_google_auth_url, exchange_code_for_tokens, get_user_info
from auth.jwt_handler import create_access_token, get_current_user
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/auth", tags=["auth"])

# Temporary state store (in production, use Redis or DB)
_state_store: dict[str, bool] = {}


@router.get("/google")
async def google_login():
    """Redirect user to Google OAuth2 consent screen."""
    state = secrets.token_urlsafe(16)
    _state_store[state] = True
    auth_url = get_google_auth_url(state=state)
    return RedirectResponse(url=auth_url)


@router.get("/callback")
async def google_callback(
    code: str,
    state: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth2 callback, upsert user, and set JWT cookie."""
    if state and state not in _state_store:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    _state_store.pop(state, None)

    # Exchange code for tokens
    token_data = await exchange_code_for_tokens(code)
    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)
    token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Get user profile
    user_info = await get_user_info(access_token)
    google_id = user_info["sub"]
    email = user_info["email"]
    name = user_info.get("name", email)
    picture = user_info.get("picture")

    # Upsert user
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(google_id=google_id, email=email, name=name, picture=picture)
        db.add(user)
        await db.flush()  # get user.id

    # Upsert Google token
    result2 = await db.execute(select(GoogleToken).where(GoogleToken.user_id == user.id))
    google_token = result2.scalar_one_or_none()

    if not google_token:
        google_token = GoogleToken(user_id=user.id)
        db.add(google_token)

    google_token.access_token = access_token
    if refresh_token:
        google_token.refresh_token = refresh_token
    google_token.token_expiry = token_expiry
    google_token.token_uri = "https://oauth2.googleapis.com/token"
    google_token.scopes = " ".join(settings.google_scopes)

    await db.commit()
    await db.refresh(user)

    # Issue JWT
    jwt_token = create_access_token(user.id, user.email)

    # Redirect to frontend with cookie
    response = RedirectResponse(url=f"{settings.frontend_url}/chat")
    cookie_kwargs = dict(
        key="access_token",
        value=jwt_token,
        httponly=True,
        samesite=settings.cookie_samesite,
        max_age=settings.jwt_expire_minutes * 60,
        secure=settings.cookie_secure,
    )
    if settings.cookie_domain:
        cookie_kwargs["domain"] = settings.cookie_domain
    response.set_cookie(**cookie_kwargs)
    return response


@router.post("/logout")
async def logout(response: Response):
    """Clear the JWT cookie."""
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user's profile."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
    }
