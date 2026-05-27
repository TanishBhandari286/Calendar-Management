from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from config import get_settings
from routers import auth, chat, calendar

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize the database on startup."""
    await init_db()
    yield


app = FastAPI(
    title="AI Personal Planner",
    description="Natural language Google Calendar assistant with multi-user support",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the React dev server + production domain
allowed_origins = [
    settings.frontend_url,
    "http://localhost:5173",
    "http://localhost:3000",
    "https://calendar.tanish.cloud",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(calendar.router)


@app.get("/")
async def root():
    return {
        "status": "running",
        "app": "AI Personal Planner",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
