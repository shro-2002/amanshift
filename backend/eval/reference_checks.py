"""Reference reproduction (T-REF-01..04) and evaluation manifest (T-DQ-01) -> eval/out."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import thermofeel

from amanshift.data.fetch import MANIFEST
from amanshift.engine import risk
from amanshift.policy.loader import POLICY_PATH, load_policy
from amanshift.screening.wbgt import cos_zenith

BACKEND = Path(__file__).resolve().parents[1]
GOLDEN = BACKEND / "tests" / "golden"
OUT = BACKEND.parent / "eval" / "out"


def main() -> int:
    pol = load_policy()
    t = np.genfromtxt(GOLDEN / "thermofeel" / "thermofeel_testcases.csv", delimiter=",", names=True)
    exp = np.loadtxt(GOLDEN / "thermofeel" / "wbgt_liljegren.csv")
    rh = thermofeel.calculate_relative_humidity_percent(t["t2m"], t["td"])
    got = thermofeel.calculate_wbgt_liljegren(t["t2m"], rh, np.full_like(t["t2m"], 1013.25), t["va"],
                                              t["ssrd"] / 3600, t["fdir"] / t["ssrd"], t["cossza"])
    ok = ~np.isnan(exp)
    niosh = json.loads((GOLDEN / "niosh.json").read_text())
    rows = [{"M_w": r["M_w"], "rel_expected": r["rel_c"], "rel_computed": round(risk.rel(r["M_w"], pol), 3),
             "ral_expected": r["ral_c"], "ral_computed": round(risk.ral(r["M_w"], pol), 3)} for r in niosh["rows"]]
    times = pd.date_range("2026-06-21 07:50", "2026-06-21 08:50", freq="1min", tz="UTC")
    cz = float(cos_zenith(times).max())
    report = {
        "data_type": "reference values",
        "t_ref_01_liljegren": {"vectors": int(ok.sum()), "max_abs_error_c":
                               float(np.nanmax(np.abs(got[ok] - exp[ok]))), "tolerance_c": 0.05,
                               "source": "thermofeel 2.3.0 shipped test vectors"},
        "t_ref_02_niosh": {"rows": rows, "tolerance_c": 0.05,
                           "note": "NIOSH reads 27.8 degC off Figure 8-2 for 348.9 W; equation gives 27.46"},
        "t_ref_04_solar": {"max_cos_zenith_21jun": round(cz, 5),
                           "expected": round(float(np.cos(np.radians(abs(24.433 - 23.44)))), 5),
                           "tolerance": 0.01},
        "policy_sha256": hashlib.sha256(POLICY_PATH.read_bytes()).hexdigest(),
    }
    report["all_pass"] = bool(
        report["t_ref_01_liljegren"]["max_abs_error_c"] <= 0.05
        and all(abs(r["rel_expected"] - r["rel_computed"]) <= 0.05 and
                abs(r["ral_expected"] - r["ral_computed"]) <= 0.05 for r in rows)
        and abs(cz - report["t_ref_04_solar"]["expected"]) < 0.01)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "reference_checks.json").write_text(json.dumps(report, indent=2) + "\n")
    manifest = {"datasets": json.loads(MANIFEST.read_text()),
                "licences": {"open-meteo": "CC BY 4.0 (data); free API, non-commercial",
                             "iem": "Iowa Environmental Mesonet ASOS archive, public; cite IEM"}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"reference_all_pass": report["all_pass"]}))
    return 0 if report["all_pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
