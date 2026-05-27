# AI Personal Planner 🗓️

An AI-powered personal planner that manages your Google Calendar through natural language conversation.

## Features
- 🤖 **Natural language** — "Schedule DSA study 3-4pm tomorrow"
- 🧠 **Conversation memory** — "Cancel the last event" just works
- 📊 **Analytics** — "How many hours did I study this week?"
- 👥 **Multi-user** — Each user's data is fully isolated
- 🔐 **Google OAuth2** — One-click sign-in, no passwords

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: FastAPI + SQLAlchemy (SQLite)
- **AI**: Google Gemini 2.0 Flash (function calling)
- **Auth**: Google OAuth2 + JWT (httpOnly cookies)

---

## Setup

### 1. Google Cloud Setup (Required)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Calendar API**
3. Create OAuth 2.0 credentials (Web application)
4. Add `http://localhost:8000/auth/callback` as an authorized redirect URI
5. Add your Google email as a test user in the OAuth consent screen

### 2. Get Gemini API Key
Get a free key at: https://aistudio.google.com/app/api-keys

### 3. Configure Backend
```bash
cd backend
cp .env.example .env
# Edit .env and fill in your credentials
```

### 4. Install & Run Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 5. Install & Run Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Usage Examples

| You say | What happens |
|---------|-------------|
| "Schedule DSA study 3-4pm today" | Creates Google Calendar event |
| "Cancel the last event" | Deletes the most recently discussed event |
| "How many hours of DSA this week?" | Sums up DSA event durations |
| "Move tomorrow's meeting to 4pm" | Updates the event time |
| "What's on my schedule this week?" | Lists all upcoming events |

---

## Project Structure
```
ai-planner/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── config.py            # Settings from .env
│   ├── database.py          # SQLAlchemy + SQLite
│   ├── models.py            # User, GoogleToken, ChatMessage
│   ├── auth/
│   │   ├── google_oauth.py  # OAuth2 flow
│   │   └── jwt_handler.py   # JWT creation + validation
│   ├── routers/
│   │   ├── auth.py          # /auth/* endpoints
│   │   ├── chat.py          # /chat/* endpoints
│   │   └── calendar.py      # /calendar/events endpoint
│   └── agent/
│       ├── planner_agent.py # Gemini tool-calling loop + memory
│       └── calendar_tools.py # CRUD tool functions
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   └── ChatPage.jsx
    │   ├── components/
    │   │   ├── CalendarSidebar.jsx
    │   │   ├── ChatBubble.jsx
    │   │   └── TypingIndicator.jsx
    │   ├── api/client.js
    │   ├── context/AuthContext.jsx
    │   ├── App.jsx
    │   └── index.css
    └── vite.config.js
```
