"""Writes one JSON line per property test when AMANSHIFT_PROP_REPORT is set (eval/property_report)."""

from __future__ import annotations

import json
import os
from typing import Any


def pytest_runtest_logreport(report: Any) -> None:
    path = os.environ.get("AMANSHIFT_PROP_REPORT")
    if path and report.when == "call":
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps({"name": report.nodeid.split("::")[-1], "outcome": report.outcome,
                                 "seconds": round(report.duration, 2)}) + "\n")
