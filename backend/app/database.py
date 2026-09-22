"""
Database initialization and seeding for QueryMind.
Creates and populates the demo SQLite database with students, courses, and enrollments.
"""
import sqlite3
import os
from pathlib import Path

# Vercel's writable filesystem is ephemeral and limited to /tmp. Keep the
# local database beside the backend source during development.
LOCAL_DB_PATH = Path(__file__).parent.parent / "querymind.db"
DB_PATH = Path(os.getenv("SQLITE_DB_PATH") or ("/tmp/querymind.db" if os.getenv("VERCEL") else LOCAL_DB_PATH))


def get_db_path() -> str:
    return str(DB_PATH)


def init_db() -> None:
    """Initialize the database and seed it with demo data if needed."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()

    # Create tables
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            department TEXT NOT NULL,
            cgpa REAL NOT NULL CHECK(cgpa >= 0 AND cgpa <= 10),
            year INTEGER NOT NULL CHECK(year >= 1 AND year <= 5),
            admission_year INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            credits INTEGER NOT NULL CHECK(credits > 0),
            department TEXT NOT NULL,
            semester TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS professors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            department TEXT NOT NULL,
            designation TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            semester TEXT NOT NULL,
            grade TEXT,
            FOREIGN KEY (student_id) REFERENCES students(id),
            FOREIGN KEY (course_id) REFERENCES courses(id),
            UNIQUE(student_id, course_id, semester)
        );

        CREATE TABLE IF NOT EXISTS query_history (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            sql TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            valid INTEGER NOT NULL DEFAULT 1,
            row_count INTEGER,
            execution_duration_ms REAL,
            error TEXT
        );
    """)

    # Seed only when every demo table already contains data. This also repairs
    # databases left behind by an interrupted first initialization.
    cursor.execute(
        "SELECT COUNT(*) FROM students WHERE EXISTS (SELECT 1 FROM courses) "
        "AND EXISTS (SELECT 1 FROM professors) AND EXISTS (SELECT 1 FROM enrollments)"
    )
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # Seed students
    students = [
        ("Aarav Sharma", "aarav.sharma@college.edu", "Computer Science", 9.2, 3, 2022),
        ("Priya Patel", "priya.patel@college.edu", "Computer Science", 8.7, 2, 2023),
        ("Rohan Mehta", "rohan.mehta@college.edu", "Electronics", 7.8, 4, 2021),
        ("Sneha Gupta", "sneha.gupta@college.edu", "Mathematics", 9.5, 1, 2024),
        ("Arjun Nair", "arjun.nair@college.edu", "Computer Science", 6.9, 3, 2022),
        ("Kavya Reddy", "kavya.reddy@college.edu", "Data Science", 8.1, 2, 2023),
        ("Vikram Singh", "vikram.singh@college.edu", "Electronics", 7.3, 4, 2021),
        ("Meera Joshi", "meera.joshi@college.edu", "Mathematics", 8.9, 1, 2024),
        ("Aditya Kumar", "aditya.kumar@college.edu", "Computer Science", 9.8, 5, 2020),
        ("Divya Iyer", "divya.iyer@college.edu", "Data Science", 7.6, 3, 2022),
        ("Nikhil Verma", "nikhil.verma@college.edu", "Computer Science", 5.8, 2, 2023),
        ("Pooja Agarwal", "pooja.agarwal@college.edu", "Electronics", 8.4, 4, 2021),
        ("Rahul Das", "rahul.das@college.edu", "Mathematics", 6.5, 3, 2022),
        ("Ananya Bhatt", "ananya.bhatt@college.edu", "Data Science", 9.1, 1, 2024),
        ("Karan Malhotra", "karan.malhotra@college.edu", "Computer Science", 7.2, 5, 2020),
        ("Shreya Pillai", "shreya.pillai@college.edu", "Electronics", 8.6, 2, 2023),
        ("Siddharth Roy", "siddharth.roy@college.edu", "Computer Science", 8.0, 4, 2021),
        ("Tanvi Kapoor", "tanvi.kapoor@college.edu", "Data Science", 7.4, 3, 2022),
        ("Yash Thakur", "yash.thakur@college.edu", "Mathematics", 9.3, 1, 2024),
        ("Zara Khan", "zara.khan@college.edu", "Computer Science", 8.8, 5, 2020),
    ]

    cursor.executemany(
        "INSERT OR IGNORE INTO students (name, email, department, cgpa, year, admission_year) VALUES (?, ?, ?, ?, ?, ?)",
        students,
    )

    # Seed courses
    courses = [
        ("Data Structures", "CS101", 4, "Computer Science", "Odd"),
        ("Algorithms", "CS201", 4, "Computer Science", "Even"),
        ("Database Systems", "CS301", 3, "Computer Science", "Odd"),
        ("Machine Learning", "CS401", 4, "Computer Science", "Even"),
        ("Operating Systems", "CS202", 3, "Computer Science", "Even"),
        ("Computer Networks", "CS302", 3, "Computer Science", "Odd"),
        ("Digital Circuits", "EC101", 4, "Electronics", "Odd"),
        ("Signal Processing", "EC201", 4, "Electronics", "Even"),
        ("Embedded Systems", "EC301", 3, "Electronics", "Odd"),
        ("VLSI Design", "EC401", 3, "Electronics", "Even"),
        ("Calculus", "MA101", 4, "Mathematics", "Odd"),
        ("Linear Algebra", "MA201", 4, "Mathematics", "Even"),
        ("Probability & Statistics", "MA301", 3, "Mathematics", "Odd"),
        ("Data Science Fundamentals", "DS101", 4, "Data Science", "Odd"),
        ("Python for Data Science", "DS201", 3, "Data Science", "Even"),
        ("Deep Learning", "DS301", 4, "Data Science", "Odd"),
        ("Natural Language Processing", "DS401", 4, "Data Science", "Even"),
        ("Cloud Computing", "CS501", 3, "Computer Science", "Odd"),
    ]

    cursor.executemany(
        "INSERT OR IGNORE INTO courses (name, code, credits, department, semester) VALUES (?, ?, ?, ?, ?)",
        courses,
    )

    # Seed professors
    professors = [
        ("Dr. Ramesh Kumar", "ramesh.kumar@college.edu", "Computer Science", "Professor"),
        ("Dr. Sunita Mehta", "sunita.mehta@college.edu", "Computer Science", "Associate Professor"),
        ("Dr. Ajay Verma", "ajay.verma@college.edu", "Electronics", "Professor"),
        ("Dr. Priya Nair", "priya.nair@college.edu", "Mathematics", "Assistant Professor"),
        ("Dr. Sanjay Reddy", "sanjay.reddy@college.edu", "Data Science", "Professor"),
    ]

    cursor.executemany(
        "INSERT OR IGNORE INTO professors (name, email, department, designation) VALUES (?, ?, ?, ?)",
        professors,
    )

    # Seed enrollments
    enrollments = [
        (1, 1, "2022-Odd", "A"), (1, 2, "2023-Even", "A+"), (1, 3, "2023-Odd", "B+"),
        (1, 4, "2024-Even", "A"), (1, 5, "2023-Even", "B"),
        (2, 1, "2023-Odd", "B+"), (2, 2, "2024-Even", "A"), (2, 5, "2024-Even", "B+"),
        (3, 7, "2021-Odd", "B"), (3, 8, "2022-Even", "B+"), (3, 9, "2022-Odd", "A"),
        (4, 11, "2024-Odd", "A+"), (4, 12, "2025-Even", "A"),
        (5, 1, "2022-Odd", "C+"), (5, 2, "2023-Even", "B"), (5, 3, "2023-Odd", "C"),
        (6, 14, "2023-Odd", "B+"), (6, 15, "2024-Even", "A"),
        (7, 7, "2021-Odd", "C+"), (7, 8, "2022-Even", "B"),
        (8, 11, "2024-Odd", "A"), (8, 13, "2024-Odd", "A+"),
        (9, 1, "2020-Odd", "A+"), (9, 2, "2021-Even", "A+"), (9, 4, "2022-Even", "A+"),
        (9, 5, "2021-Even", "A"), (9, 17, "2023-Odd", None),
        (10, 14, "2022-Odd", "B+"), (10, 15, "2023-Even", "A"), (10, 16, "2023-Odd", "B"),
        (11, 1, "2023-Odd", "D"), (11, 5, "2024-Even", "C"),
        (12, 7, "2021-Odd", "B+"), (12, 9, "2022-Odd", "A"),
        (13, 11, "2022-Odd", "C"), (13, 12, "2023-Even", "B"),
        (14, 14, "2024-Odd", "A+"), (14, 16, "2024-Odd", "A"),
        (15, 2, "2020-Even", "B+"), (15, 4, "2021-Even", "B"),
        (16, 8, "2023-Even", "A"), (16, 10, "2024-Even", "A+"),
        (17, 1, "2021-Odd", "B"), (17, 3, "2022-Odd", "B+"),
        (18, 15, "2022-Even", "B+"), (18, 16, "2022-Odd", "A"),
        (19, 11, "2024-Odd", "A+"), (19, 13, "2024-Odd", "A"),
        (20, 4, "2020-Even", "A+"), (20, 17, "2021-Odd", "A"),
    ]

    cursor.executemany(
        "INSERT OR IGNORE INTO enrollments (student_id, course_id, semester, grade) VALUES (?, ?, ?, ?)",
        enrollments,
    )

    conn.commit()
    conn.close()
    print(f"[DB] Database initialized and seeded at {DB_PATH}")
