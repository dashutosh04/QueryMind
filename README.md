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
| Frontend | React 19, Vite 8, TypeScript 6, hand-rolled CSS design system |
| Icons | Lucide React |
| Backend | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| AI | Groq API, LangChain (`langchain-groq`, `langchain-core`) |
| Workflow | LangGraph |
| Database | SQLite (stdlib `sqlite3`, no ORM) |

---

## Architecture

```
Browser (React + Vite)
      │
      │  HTTP (fetch)
      ▼
FastAPI Backend (port 8000)
      │
      ├── GET    /api/health    → Health check
      ├── GET    /api/schema    → Database schema
      ├── POST   /api/generate  → Natural language → SQL (LangGraph)
      ├── POST   /api/explain   → SQL → explanation (Groq)
      ├── POST   /api/execute   → Execute safe SELECT query (SQLite)
      ├── GET    /api/history   → List persisted query history
      ├── POST   /api/history   → Save a query history entry
      ├── DELETE /api/history   → Clear all history
      └── DELETE /api/history/{id} → Delete a single history entry
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
├── package.json          Root scripts (runs backend + frontend together)
├── pnpm-lock.yaml
├── frontend/
│   ├── src/
│   │   ├── components/      React UI components
│   │   ├── pages/Dashboard.tsx
│   │   ├── lib/api.ts       fetch-based API client
│   │   ├── types/index.ts   TypeScript types
│   │   ├── index.css        Design system
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/favicon.png
│   ├── .env.example
│   └── vite.config.ts
│
└── backend/
    ├── api/index.py       Vercel serverless entrypoint
    ├── app/
    │   ├── main.py          FastAPI app
    │   ├── config.py        Settings
    │   ├── database.py      SQLite init + seeding
    │   ├── schemas.py       Pydantic models
    │   ├── api/             Route handlers (health, schema, query, execute, history)
    │   ├── ai/              LLM, prompts, LangGraph
    │   └── services/        SQL validator, schema, query
    ├── requirements.txt
    ├── vercel.json
    └── .env.example
```

## Prerequisites

- Python 3.11+
- Node.js 20+
- [pnpm](https://pnpm.io/) 9+
- A [Groq API key](https://console.groq.com/)

---

## Setup

### 1. Clone

```bash
git clone <repo-url>
cd QueryMind
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
pnpm install

# Configure environment
cp .env.example .env
# Edit .env if backend runs on a different port
```

---

## Run

Install the root dev dependency once, then use the combined dev script:

```bash
pnpm install
pnpm dev
```

This starts the backend on port 8000 and the frontend on port 5173 together.

### Backend only

```bash
cd backend
.venv\Scripts\activate   # Windows
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend only

```bash
cd frontend
pnpm dev
```

App: http://localhost:5173

## Deploy the Backend to Vercel

Create a separate Vercel project for the backend and set its **Root Directory** to `backend`. Vercel will use `api/index.py` as the Python function entrypoint and `vercel.json` for routing.

Add these environment variables to the Vercel backend project:

```
GROQ_API_KEY=your_groq_api_key_here
ALLOWED_ORIGINS=["https://query-mind-frontend.vercel.app","https://query-mind-sql.vercel.app"]
```

SQLite data is stored in Vercel's temporary `/tmp` filesystem. It is suitable for this demo, but query history and any database changes can be lost when the function is recreated. Use a hosted database for persistent production data.

## Deploy the Frontend to Vercel

Create a Vercel project for the frontend with its **Root Directory** set to `frontend`. Vite reads `VITE_API_URL` at build time, so add it to the Vercel frontend project and point it at the deployed backend:

```
VITE_API_URL=https://<your-backend-domain>
```

Allowed frontend origins must also be listed in the backend's `ALLOWED_ORIGINS` (see above), otherwise the browser will block the API calls.

---

## Environment Variables

### Backend (`backend/.env`)

```
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b
MAX_RETRIES=3
GROQ_TEMPERATURE=0.0
ALLOWED_ORIGINS=["http://localhost:5173","http://localhost:4173","https://query-mind-frontend.vercel.app","https://query-mind-sql.vercel.app"]
```

The SQLite file path is **not** configured here — `app/database.py` resolves it to
`backend/querymind.db` locally and `/tmp/querymind.db` on Vercel. Override locally
with `SQLITE_DB_PATH` if needed.

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
| GET | `/api/history` | List all query history (newest first) |
| POST | `/api/history` | Save a query history entry |
| DELETE | `/api/history/{id}` | Delete a single history entry |
| DELETE | `/api/history` | Clear all history (irreversible) |

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

## Running Benchmarks

The project includes a benchmark suite to evaluate SQL generation correctness against a set of 20 ground-truth queries.

### Run benchmarks

```bash
# Start the backend first (required)
cd backend
.venv\Scripts\activate
uvicorn app.main:app --port 8000
```

In a separate terminal:

```bash
cd test_results
python benchmark.py
```

This runs all 20 test cases and saves raw results to `test_results/benchmark_raw.json`.

### Normalized comparison

```bash
cd test_results
python compare_normalized.py
```

This re-evaluates results using semantic row matching (ignoring column order and extra columns) and updates `benchmark_raw.json` with `correct_normalized` flags.

### Benchmark files

| File | Description |
|---|---|
| `test_results/benchmark.py` | Main benchmark runner |
| `test_results/benchmark_cases.json` | Ground-truth SQL for 20 test questions |
| `test_results/benchmark_raw.json` | Raw benchmark output (duration, validity, correctness) |
| `test_results/compare_normalized.py` | Semantic row comparison script |

---

## Future Improvements

- Multi-database support (PostgreSQL, MySQL)
- Query optimization suggestions
- Export results as CSV/JSON
- User authentication and query persistence
- Fine-tuned model for SQL generation
- Query scheduling and saved views
