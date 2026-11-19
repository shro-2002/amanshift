"""`make eval`: regenerate every artifact in eval/out, then report.md. Target runtime < 10 min."""

from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
STEPS = (
    "eval.reference_checks",
    "eval.forecast_eval",
    "eval.select_scenario",
    "eval.checker_mutation",
    "eval.planner_bench",
    "eval.cost_of_safety",
    "eval.property_report",
    "eval.report",
)


def main() -> int:
    failed = []
    for mod in STEPS:
        t = time.time()
        rc = subprocess.run([sys.executable, "-m", mod], cwd=BACKEND, check=False).returncode
        print(f"[eval] {mod}: rc={rc} ({time.time() - t:.0f} s)", flush=True)
        if rc != 0:
            failed.append(mod)
    if failed:
        print("[eval] FAILED:", ", ".join(failed))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
