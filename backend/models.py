from datetime import datetime
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class OAuthState(Base):
    __tablename__ = "oauth_states"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    state: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    google_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    picture: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    token: Mapped["GoogleToken"] = relationship("GoogleToken", back_populates="user", uselist=False, cascade="all, delete-orphan")
    messages: Mapped[list["ChatMessage"]] = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan", order_by="ChatMessage.timestamp")
    goals: Mapped[list["UserGoal"]] = relationship("UserGoal", back_populates="user", cascade="all, delete-orphan")


class GoogleToken(Base):
    __tablename__ = "google_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True)
    access_token: Mapped[str] = mapped_column(Text)
    refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_expiry: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    token_uri: Mapped[str | None] = mapped_column(String(512), nullable=True)
    scopes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="token")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(16))  # "user" or "model"
    content: Mapped[str] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="messages")


class UserGoal(Base):
    __tablename__ = "user_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))          # e.g. "DSA Study"
    keyword: Mapped[str] = mapped_column(String(64))         # matched against event titles
    target_hours: Mapped[float] = mapped_column(Float, default=10.0)
    color: Mapped[str] = mapped_column(String(16), default="#FF453A")
    emoji: Mapped[str] = mapped_column(String(8), default="📚")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="goals")
