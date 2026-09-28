import json
import sqlite3
import sys
import time
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

API = "http://127.0.0.1:8000/api/generate"
DB = "querymind.db"

# (question, ground_truth_sql)
CASES = [
    ("Show students with CGPA above 8",
     "SELECT id, name, department, cgpa FROM students WHERE cgpa > 8"),
    ("Find average CGPA by department",
     "SELECT department, AVG(cgpa) FROM students GROUP BY department"),
    ("How many students are enrolled in each course?",
     "SELECT c.name, COUNT(e.student_id) FROM courses c JOIN enrollments e ON e.course_id = c.id GROUP BY c.name"),
    ("List all courses in the Computer Science department",
     "SELECT name, code, credits FROM courses WHERE department = 'Computer Science'"),
    ("Which student has the highest CGPA?",
     "SELECT name, cgpa FROM students ORDER BY cgpa DESC LIMIT 1"),
    ("Count the total number of students",
     "SELECT COUNT(*) FROM students"),
    ("Show the names of students enrolled in Database Systems",
     "SELECT s.name FROM students s JOIN enrollments e ON e.student_id = s.id JOIN courses c ON c.id = e.course_id WHERE c.name = 'Database Systems'"),
    ("List students in year 3 with CGPA above 7",
     "SELECT name, year, cgpa FROM students WHERE year = 3 AND cgpa > 7"),
    ("What is the average number of credits per department?",
     "SELECT department, AVG(credits) FROM courses GROUP BY department"),
    ("Show the top 5 students by CGPA",
     "SELECT name, cgpa FROM students ORDER BY cgpa DESC LIMIT 5"),
    ("How many courses does each professor's department offer? List department and course count",
     "SELECT department, COUNT(*) FROM courses GROUP BY department"),
    ("Find students whose email contains 'college.edu' and are in Data Science",
     "SELECT name, email FROM students WHERE department = 'Data Science'"),
    ("Which courses have more than 2 enrollments?",
     "SELECT c.name, COUNT(e.student_id) AS cnt FROM courses c JOIN enrollments e ON e.course_id = c.id GROUP BY c.name HAVING cnt > 2"),
    ("List all professors in the Electronics department",
     "SELECT name, designation FROM professors WHERE department = 'Electronics'"),
    ("What is the minimum CGPA in each year?",
     "SELECT year, MIN(cgpa) FROM students GROUP BY year"),
    ("Show course codes and names sorted alphabetically",
     "SELECT code, name FROM courses ORDER BY name"),
    ("How many students got grade A or A+ in any course?",
     "SELECT COUNT(DISTINCT student_id) FROM enrollments WHERE grade IN ('A', 'A+')"),
    ("List students who have not received a grade yet",
     "SELECT s.name FROM students s JOIN enrollments e ON e.student_id = s.id WHERE e.grade IS NULL"),
    ("What is the total credits offered by the Mathematics department?",
     "SELECT SUM(credits) FROM courses WHERE department = 'Mathematics'"),
    ("Show each student's name with the number of courses they are enrolled in",
     "SELECT s.name, COUNT(e.course_id) FROM students s JOIN enrollments e ON e.student_id = s.id GROUP BY s.name"),
]


def rows_of(sql):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(sql)
    rows = sorted([tuple(r) for r in cur.fetchall()])
    conn.close()
    return rows


def call_generate(question):
    body = json.dumps({"question": question}).encode()
    req = urllib.request.Request(API, data=body, headers={"Content-Type": "application/json"})
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read())
    return data, (time.time() - t0) * 1000


results = []
for i, (q, gt_sql) in enumerate(CASES, 1):
    expected = rows_of(gt_sql)
    entry = {"n": i, "question": q}
    try:
        data, wall_ms = call_generate(q)
        entry["sql"] = data["sql"]
        entry["valid"] = data["validation"]["valid"]
        entry["duration_ms"] = data.get("duration_ms", 0)
        entry["wall_ms"] = round(wall_ms, 1)
        entry["revision_attempts"] = data.get("revision_attempts", 0)
        entry["ambiguous"] = data.get("is_ambiguous", False)
        if entry["valid"] and not entry["ambiguous"] and data["sql"]:
            try:
                got = rows_of(data["sql"].rstrip(";"))
                entry["correct"] = (got == expected)
                if not entry["correct"]:
                    entry["expected_rows"] = expected[:5]
                    entry["got_rows"] = got[:5]
            except sqlite3.Error as e:
                entry["correct"] = False
                entry["exec_error"] = str(e)
        else:
            entry["correct"] = False
    except Exception as e:
        entry["error"] = str(e)
        entry["valid"] = False
        entry["correct"] = False
    status = "PASS" if entry["correct"] else "FAIL"
    print(f"[{i:02d}] {status} valid={entry.get('valid')} attempts={entry.get('revision_attempts',0)} "
          f"{entry.get('duration_ms',0):.0f}ms :: {q[:55]}")
    results.append(entry)
    time.sleep(1)  # gentle on rate limits

with open("test_results/benchmark_raw.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

n = len(results)
valid = sum(1 for r in results if r.get("valid"))
correct = sum(1 for r in results if r.get("correct"))
durs = [r.get("duration_ms", 0) for r in results]
walls = [r.get("wall_ms", 0) for r in results]
attempts = sum(1 for r in results if r.get("revision_attempts", 0) > 0)
print("\n===== SUMMARY =====")
print(f"Total questions:        {n}")
print(f"Validation valid=true:  {valid}/{n}  ({valid/n:.0%})")
print(f"Execution correctness:  {correct}/{n}  ({correct/n:.0%})")
print(f"Avg duration_ms (API):  {sum(durs)/n:.0f} ms   min={min(durs):.0f} max={max(durs):.0f}")
print(f"Avg wall time:          {sum(walls)/n:.0f} ms")
print(f"Used correction loop:   {attempts}/{n}")
