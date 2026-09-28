import json
import sqlite3
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
DB = "querymind.db"


def rows_of(sql):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute(sql)
    rows = [tuple(r) for r in cur.fetchall()]
    conn.close()
    return rows


def canon(v):
    if v is None:
        return "<null>"
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v).strip().lower()


def semantic_match(expected, got):
    """expected/got: list of row tuples. Match multiset ignoring order and extra got-columns."""
    if len(got) != len(expected):
        return False
    # index got rows by multiset of canonical values
    remaining = [set(canon(v) for v in row) for row in got]
    for exp_row in expected:
        exp_vals = set(canon(v) for v in exp_row)
        found = False
        for i, gvals in enumerate(remaining):
            if gvals is None:
                continue
            if exp_vals <= gvals:
                remaining[i] = None  # consume
                found = True
                break
        if not found:
            return False
    return True


raw = json.load(open("test_results/benchmark_raw.json", encoding="utf-8"))
CASES = json.load(open("test_results/benchmark_cases.json", encoding="utf-8"))
gt_by_n = {c["n"]: c["gt_sql"] for c in CASES}

correct = 0
summary = []
for r in raw:
    n = r["n"]
    expected = rows_of(gt_by_n[str(n)] if str(n) in gt_by_n else gt_by_n[n])
    if r.get("valid") and not r.get("ambiguous") and r.get("sql"):
        try:
            got = rows_of(r["sql"].rstrip(";"))
            ok = semantic_match(expected, got)
        except sqlite3.Error as e:
            ok = False
            r["exec_error"] = str(e)
    else:
        ok = False
    r["correct_normalized"] = ok
    correct += ok
    summary.append((n, ok))
    print(f"[{n:02d}] {'PASS' if ok else 'FAIL'} :: {r['question'][:60]}")

json.dump(raw, open("test_results/benchmark_raw.json", "w", encoding="utf-8"), indent=2, ensure_ascii=False)

n = len(raw)
valid = sum(1 for r in raw if r.get("valid"))
print("\n===== NORMALIZED SUMMARY =====")
print(f"Total questions:        {n}")
print(f"Validation valid=true:  {valid}/{n} ({valid/n:.0%})")
print(f"Execution correctness:  {correct}/{n} ({correct/n:.0%})")
durs = [r.get("duration_ms", 0) for r in raw]
print(f"Avg duration_ms (API):  {sum(durs)/n:.0f}  min={min(durs):.0f} max={max(durs):.0f}")
