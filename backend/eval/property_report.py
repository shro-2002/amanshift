"""Run the full-size fail-safe property tests and write eval/out/property_tests.json (SYNTH-TEST)."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
OUT = BACKEND.parent / "eval" / "out"
N_MAIN = 10000
SIZES = {  # examples per test, mirroring tests/property/test_kernel_props.py
    "test_t_ker_01_02_single_degradation_shrinks_permitted_and_raises_level": N_MAIN,
    "test_t_ker_03_composition": N_MAIN // 5,
    "test_t_ker_04_planner_output_on_degraded_state_is_approved": N_MAIN // 5,
    "test_t_ker_05_meter_reading_never_lowers_level": N_MAIN // 5,
    "test_t_ker_06_no_relaxation_before_dwell_or_confirmation": N_MAIN // 5,
    "test_t_ker_07_determinism_and_canonical_roundtrip": N_MAIN // 20,
    "test_t_chk_diff_checker_verdict_equals_kernel_membership": N_MAIN // 20,
}


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    log = OUT / "property_results.jsonl"
    log.unlink(missing_ok=True)
    env = {**os.environ, "AMANSHIFT_PROP_N": str(N_MAIN), "PYTHONPATH": str(BACKEND),
           "AMANSHIFT_PROP_REPORT": str(log)}
    t0 = time.time()
    proc = subprocess.run(
        [sys.executable, "-m", "pytest", "tests/property", "-q"],
        cwd=BACKEND, env=env, capture_output=True, text=True, check=False)
    elapsed = round(time.time() - t0, 1)
    tests = []
    for line in log.read_text().splitlines() if log.exists() else []:
        row = json.loads(line)
        failed = row["outcome"] != "passed"
        tests.append({"test": row["name"], "examples": SIZES.get(row["name"]),
                      "violations": int(failed), "status": row["outcome"], "seconds": row["seconds"]})
    log.unlink(missing_ok=True)
    report = {"data_type": "SYNTH-TEST", "generator": "hypothesis, derandomized",
              "tests": tests, "total_examples": sum(t["examples"] or 0 for t in tests),
              "failures": sum(t["violations"] for t in tests), "elapsed_s": elapsed,
              "command": "make eval (backend/eval/property_report.py)"}
    (OUT / "property_tests.json").write_text(json.dumps(report, indent=2) + "\n")
    print(proc.stdout[-2000:])
    return 0 if report["failures"] == 0 and proc.returncode == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
