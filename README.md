# QueryMind - AI-Powered Natural Language SQL Query Generator

> Convert plain English questions into valid SQL queries using **Groq API**, **LangChain**, and **LangGraph**.

---

## Features

- **Natural Language → SQL** - Ask questions in plain English, get SQL back
- **LangGraph Workflow** - Automatic SQL revision loop if validation fails
- **SQL Validation** - Syntax and safety checks before execution
- **Query Explanation** - Plain-English breakdown of what the SQL does
- **Safe Execution** - SELECT-only queries against a demo SQLite database
- **Results Table** - View query output in a formatted table
- **Query History** - Session-based history of all queries
- **Schema Viewer** - Browse the database schema interactively
- **Copy SQL** - One-click copy to clipboard

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Icons | Lucide React |
| Backend | Python 3.11+, FastAPI, Uvicorn, Pydantic |
| AI | Groq API, LangChain, langchain-groq |
| Workflow | LangGraph |
| Database | SQLite (via sqlite3) |

---

## Architecture

```
Browser (React + Vite)
      │
      │  HTTP (fetch)
      ▼
FastAPI Backend (port 8000)
      │
      ├── GET  /api/health    → Health check
      ├── GET  /api/schema    → Database schema
      ├── POST /api/generate  → Natural language → SQL (LangGraph)
      ├── POST /api/explain   → SQL → explanation (Groq)
      └── POST /api/execute   → Execute safe SELECT query (SQLite)
```

---

## LangGraph Workflow

```
START
  ↓
Load Schema (read SQLite schema)
  ↓
Generate SQL (Groq LLM)
  ↓
Validate SQL (safety check + SQLite EXPLAIN)
  ↓
SQL Valid?
  ├── No → Revise SQL (Groq LLM, max 3 retries) → Validate SQL
  └── Yes
        ↓
Generate Explanation (Groq LLM → JSON)
        ↓
END
```

---

## Folder Structure

```
querymind/
├── frontend/
│   ├── src/
│   │   ├── components/      React UI components
│   │   ├── pages/           Dashboard page
│   │   ├── lib/api.ts       API client
│   │   └── types/index.ts   TypeScript types
│   ├── .env.example
│   └── vite.config.ts
│
└── backend/
    ├── app/
    │   ├── main.py          FastAPI app
    │   ├── config.py        Settings
    │   ├── database.py      SQLite init + seeding
    │   ├── schemas.py       Pydantic models
    │   ├── api/             Route handlers
    │   ├── ai/              LLM, prompts, LangGraph
    │   └── services/        SQL validator, schema, query
    ├── requirements.txt
    └── .env.example
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com/)

---

## Setup

### 1. Clone

```bash
git clone <repo-url>
cd querymind
```

### 2. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/macOS
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### 3. Frontend

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env
# Edit .env if backend runs on a different port
```

---

## Run

### Backend

```bash
cd backend
.venv\Scripts\activate   # Windows
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm run dev
```

App: http://localhost:5173

## Deploy the Backend to Vercel

Create a separate Vercel project for the backend and set its **Root Directory** to `backend`. Vercel will use `api/index.py` as the Python function entrypoint and `vercel.json` for routing.

Add these environment variables to the Vercel backend project:

```
GROQ_API_KEY=your_groq_api_key_here
ALLOWED_ORIGINS=["https://query-mind-frontend.vercel.app"]
```

SQLite data is stored in Vercel's temporary `/tmp` filesystem. It is suitable for this demo, but query history and any database changes can be lost when the function is recreated. Use a hosted database for persistent production data.

---

## Environment Variables

### Backend (`backend/.env`)

```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL=sqlite:///./querymind.db
```

### Frontend (`frontend/.env`)

```
VITE_API_URL=http://localhost:8000
```

---

## Example Queries

| Natural Language | Generated SQL |
|---|---|
| Show all students with CGPA above 8 | `SELECT * FROM students WHERE cgpa > 8` |
| Find average CGPA by department | `SELECT department, AVG(cgpa) FROM students GROUP BY department` |
| Top 5 students by CGPA | `SELECT name, cgpa FROM students ORDER BY cgpa DESC LIMIT 5` |
| Count enrollments per course | `SELECT c.name, COUNT(e.id) FROM courses c JOIN enrollments e ON c.id = e.course_id GROUP BY c.id` |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/schema` | Database schema |
| POST | `/api/generate` | Generate SQL from natural language |
| POST | `/api/explain` | Explain a SQL query |
| POST | `/api/execute` | Execute a safe SELECT query |

---

## SQL Safety

Only `SELECT` queries are allowed for execution. The following are blocked:
- `INSERT`, `UPDATE`, `DELETE`
- `DROP`, `ALTER`, `CREATE`
- `ATTACH`, `DETACH`
- `PRAGMA`
- Multiple statements (`;` separator)
- SQL comment injection (`--`, `/* */`)

---

## Database Schema

### students
| Column | Type | Notes |
|---|---|---|
| id | INTEGER | PRIMARY KEY |
| name | TEXT | NOT NULL |
| email | TEXT | UNIQUE |
| department | TEXT | |
| cgpa | REAL | 0–10 |
| year | INTEGER | 1–5 |
| admission_year | INTEGER | |

### courses
| Column | Type | Notes |
|---|---|---|
| id | INTEGER | PRIMARY KEY |
| name | TEXT | |
| code | TEXT | UNIQUE |
| credits | INTEGER | |
| department | TEXT | |
| semester | TEXT | |

### enrollments
| Column | Type | Notes |
|---|---|---|
| id | INTEGER | PRIMARY KEY |
| student_id | INTEGER | FK → students |
| course_id | INTEGER | FK → courses |
| semester | TEXT | |
| grade | TEXT | nullable |

### professors
| Column | Type | Notes |
|---|---|---|
| id | INTEGER | PRIMARY KEY |
| name | TEXT | |
| email | TEXT | UNIQUE |
| department | TEXT | |
| designation | TEXT | |

---

## Future Improvements

- Multi-database support (PostgreSQL, MySQL)
- Query optimization suggestions
- Export results as CSV/JSON
- User authentication and query persistence
- Fine-tuned model for SQL generation
- Query scheduling and saved views
