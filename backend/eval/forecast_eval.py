"""Historical day-ahead forecast evaluation (doc 06 section 3).

Forecast side: HIST-FCST estimates (+delta). Reference side: REAL-OBS METAR T/RH/wind with
radiation terms from the forecast (REF-SHADE diffuse only = primary; REF-SUN partly circular).
Leakage guard (T-EVAL-LEAK-01): holdout years are read only after delta_frozen.json exists.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from amanshift.data.load import forecast_estimates, metar
from amanshift.engine import risk
from amanshift.engine.models import Crew
from amanshift.policy.loader import POLICY_PATH, Policy, load_policy, load_raw
from amanshift.screening.wbgt import cos_zenith, liljegren_c

OUT = Path(__file__).resolve().parents[2] / "eval" / "out"
DELTA_FILE = OUT / "delta_frozen.json"
TRAIN = (2024,)
HOLDOUT_EXPOSED = (2025,)
HOLDOUT_CLEAN = (2026,)
WORK_HOURS_LOCAL = (7, 18)  # [07:00, 18:00) GST
UNDER_WARNING_TARGET = 0.05
PAIRED_MIN_SHARE = 0.9
BOOTSTRAP_N = 1000
BOOTSTRAP_SEED = 20261119


class LeakageError(RuntimeError):
    pass


@dataclass(frozen=True)
class Profile:
    key: str
    workload: str
    acclimatization: str
    exposure: str
    reference: str  # "shade" (REF-SHADE) or "sun" (REF-SUN, partly circular)


PROFILES = (
    Profile("primary_moderate_acc_shade", "moderate", "acclimatized", "shaded_outdoor", "shade"),
    Profile("light_acc_shade", "light", "acclimatized", "shaded_outdoor", "shade"),
    Profile("heavy_acc_shade", "heavy", "acclimatized", "shaded_outdoor", "shade"),
    Profile("moderate_unacc_shade", "moderate", "unacclimatized", "shaded_outdoor", "shade"),
    Profile("moderate_acc_sun_PARTLY_CIRCULAR", "moderate", "acclimatized", "direct_sun", "sun"),
)


def crew_for(p: Profile) -> Crew:
    return Crew(crew_id="P", size=10, workload=p.workload, ppe="work_clothes",  # type: ignore[arg-type]
                acclimatization=p.acclimatization, exposure=p.exposure, zone_id="Z")  # type: ignore[arg-type]


def level_from_bounds(w_work: float, w_rest: float, crew: Crew, pol: Policy) -> int:
    """Same level logic as risk.assess_crew for a crew covered by shade (no floors)."""
    cav = pol.clothing_adjustment_c[crew.ppe]
    ww = w_work + cav
    ok = [f for f in pol.work_fractions if risk.feasible(f, ww, w_rest, crew, pol)]
    f_max = max(ok, default=0.0)
    if f_max == 0:
        return 4
    if f_max < 1:
        return 3
    return 2 if ww > risk.ral(pol.metabolic_w[crew.workload], pol) else 1


def paired_year(year: int) -> tuple[pd.DataFrame, dict[str, Any]]:
    if year not in TRAIN and not DELTA_FILE.exists():
        raise LeakageError(f"refusing to read holdout {year} before delta is frozen")
    fc = forecast_estimates(year)
    obs, q = metar(year)
    df = fc.merge(obs, on="time_utc", how="inner")
    cz = cos_zenith(pd.DatetimeIndex(df["time_utc"]))
    ssrd = df["shortwave_radiation_instant"].to_numpy(float)
    direct = np.minimum(df["direct_radiation_instant"].to_numpy(float), ssrd)
    fdir = np.where(ssrd > 0, direct / np.where(ssrd > 0, ssrd, 1), 0.0)
    args = (df["t_obs_c"].to_numpy(float), df["rh_obs"].to_numpy(float),
            df["surface_pressure"].to_numpy(float), df["wind_obs_ms"].to_numpy(float))
    df["ref_sun"] = liljegren_c(*args, ssrd, fdir, cz)
    df["ref_shade"] = liljegren_c(*args, ssrd - direct, np.zeros_like(ssrd), cz)
    lt = df["time_utc"] + pd.Timedelta(hours=4)
    df["local_date"], df["local_hour"] = lt.dt.date, lt.dt.hour
    season_hours = len(fc)
    q.update({"forecast_hours": float(season_hours), "paired_hours": float(len(df)),
              "paired_share": round(len(df) / season_hours, 4) if season_hours else 0.0})
    work = df[(df["local_hour"] >= WORK_HOURS_LOCAL[0]) & (df["local_hour"] < WORK_HOURS_LOCAL[1])]
    return work.dropna(subset=["ref_sun", "ref_shade", "wbgt_sun_c"]).reset_index(drop=True), q


def levels(df: pd.DataFrame, p: Profile, delta: float, pol: Policy) -> tuple[np.ndarray, np.ndarray]:
    crew = crew_for(p)
    fk = "wbgt_sun_c" if p.reference == "sun" else "wbgt_shade_c"
    rk = "ref_sun" if p.reference == "sun" else "ref_shade"
    fl = [level_from_bounds(w + delta, s + delta, crew, pol)
          for w, s in zip(df[fk], df["wbgt_shade_c"], strict=True)]
    rl = [level_from_bounds(w, s, crew, pol) for w, s in zip(df[rk], df["ref_shade"], strict=True)]
    return np.array(fl), np.array(rl)


def scores(fl: np.ndarray, rl: np.ndarray, k: int) -> dict[str, float]:
    f, r = fl >= k, rl >= k
    tp, fp, fn = int((f & r).sum()), int((f & ~r).sum()), int((~f & r).sum())
    def ratio(a: float, b: float) -> float:
        return round(a / b, 4) if b else float("nan")
    return {"k": k, "hours": int(len(fl)), "events_ref": int(r.sum()), "tp": tp, "fp": fp, "fn": fn,
            "pod": ratio(tp, tp + fn), "far": ratio(fp, tp + fp), "csi": ratio(tp, tp + fp + fn),
            "bias_ratio": ratio(tp + fp, tp + fn),
            "exact_level_agreement": round(float((fl == rl).mean()), 4) if len(fl) else float("nan"),
            "under_warning_rate": round(float((fl < rl).mean()), 4) if len(fl) else float("nan")}


def missed_days(df: pd.DataFrame, fl: np.ndarray, rl: np.ndarray, k: int) -> dict[str, int]:
    d = pd.DataFrame({"day": df["local_date"], "f": fl >= k, "r": rl >= k}).groupby("day").any()
    return {"days_with_event": int(d["r"].sum()), "missed_days": int((d["r"] & ~d["f"]).sum())}


def bootstrap(df: pd.DataFrame, fl: np.ndarray, rl: np.ndarray, k: int) -> dict[str, list[float]]:
    rng = np.random.default_rng(BOOTSTRAP_SEED)
    days = np.array(sorted(df["local_date"].unique()))
    idx_by_day = {d: np.flatnonzero(df["local_date"].to_numpy() == d) for d in days}
    stats: dict[str, list[float]] = {"pod": [], "far": [], "csi": [], "under_warning_rate": []}
    for _ in range(BOOTSTRAP_N):
        pick = np.concatenate([idx_by_day[d] for d in rng.choice(days, size=len(days))])
        s = scores(fl[pick], rl[pick], k)
        for key in stats:
            stats[key].append(s[key])
    return {key: [round(float(np.nanpercentile(v, 2.5)), 4), round(float(np.nanpercentile(v, 97.5)), 4)]
            for key, v in stats.items()}


def baseline_levels(df: pd.DataFrame, name: str, pol: Policy, thr: dict[int, float],
                    ref_levels: np.ndarray) -> np.ndarray:
    if name == "B5_always_work_rest":
        return np.full(len(df), 3)
    if name == "B1_clock_rule":
        lt = df["time_utc"] + pd.Timedelta(hours=4)
        ban = [risk.midday_active(t.to_pydatetime() - pd.Timedelta(hours=4), "direct_sun", pol)
               for t in lt]
        return np.where(ban, 4, 1)
    if name == "B2_air_temperature":
        t = df["temperature_2m"].to_numpy(float)
        return np.where(t >= thr[4], 4, np.where(t >= thr[3], 3, 1))
    if name == "B3_persistence":
        key = pd.Series(ref_levels, index=pd.MultiIndex.from_arrays(
            [pd.to_datetime(df["local_date"]), df["local_hour"]]))
        prev = [key.get((pd.Timestamp(d) - pd.Timedelta(days=1), h), np.nan)
                for d, h in zip(df["local_date"], df["local_hour"], strict=True)]
        arr = np.array(prev, dtype=float)
        return np.where(np.isnan(arr), 1, arr).astype(int)
    raise ValueError(name)


def select_delta(pol: Policy) -> dict[str, Any]:
    train = pd.concat([paired_year(y)[0] for y in TRAIN], ignore_index=True)
    rows = []
    for d in load_raw()["forecast_margin_c"]["candidates"]:
        fl, rl = levels(train, PROFILES[0], d, pol)
        rows.append({"delta": d, **scores(fl, rl, 3)})
    ok = [r for r in rows if r["under_warning_rate"] <= UNDER_WARNING_TARGET]
    chosen = min(ok, key=lambda r: r["delta"])["delta"] if ok else max(r["delta"] for r in rows)
    return {"delta": chosen, "train_years": list(TRAIN), "rule": "smallest delta with under-warning "
            f"<= {UNDER_WARNING_TARGET} for primary profile (k=3)", "candidates": rows}


def freeze_delta(sel: dict[str, Any]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    DELTA_FILE.write_text(json.dumps(sel, indent=2) + "\n")
    raw = load_raw()
    raw["forecast_margin_c"]["value"] = sel["delta"]
    POLICY_PATH.write_text(json.dumps(raw, indent=2, ensure_ascii=False) + "\n")
    load_policy.cache_clear()


def evaluate_split(years: tuple[int, ...], pol: Policy, thr: dict[int, float]) -> dict[str, Any]:
    frames, quality = [], {}
    for y in years:
        df, q = paired_year(y)
        frames.append(df)
        quality[str(y)] = q
    df = pd.concat(frames, ignore_index=True)
    out: dict[str, Any] = {"years": list(years), "data_quality": quality, "profiles": {}}
    fk_err = df["wbgt_shade_c"] - df["ref_shade"]
    out["wbgt_shade_error"] = {"mae_c": round(float(fk_err.abs().mean()), 3),
                               "bias_c": round(float(fk_err.mean()), 3), "n": int(len(df))}
    for p in PROFILES:
        fl, rl = levels(df, p, pol.forecast_margin_c, pol)
        entry: dict[str, Any] = {
            "reference": "REF-SUN (partly circular)" if p.reference == "sun" else "REF-SHADE",
            "k3": scores(fl, rl, 3), "k4": scores(fl, rl, 4), "days_k3": missed_days(df, fl, rl, 3)}
        if p is PROFILES[0]:
            entry["bootstrap95_k3"] = bootstrap(df, fl, rl, 3)
            fl0, _ = levels(df, p, 0.0, pol)
            entry["baselines_k3"] = {"B4_raw_forecast_delta0": scores(fl0, rl, 3)}
            for b in ("B1_clock_rule", "B2_air_temperature", "B3_persistence", "B5_always_work_rest"):
                entry["baselines_k3"][b] = scores(baseline_levels(df, b, pol, thr, rl), rl, 3)
        out["profiles"][p.key] = entry
    return out


def air_temp_thresholds(pol: Policy) -> dict[int, float]:
    train = pd.concat([paired_year(y)[0] for y in TRAIN], ignore_index=True)
    _, rl = levels(train, PROFILES[0], pol.forecast_margin_c, pol)
    t = train["temperature_2m"].to_numpy(float)
    return {k: round(float(np.quantile(t, 1 - float((rl >= k).mean()))), 2) for k in (3, 4)}


def main() -> int:
    pol = load_policy()
    if not DELTA_FILE.exists():
        freeze_delta(select_delta(pol))
        pol = load_policy()
    delta = json.loads(DELTA_FILE.read_text())
    thr = air_temp_thresholds(pol)
    result = {
        "data_types": ["HIST-FCST", "REAL-OBS"],
        "delta_frozen": {"value": delta["delta"], "rule": delta["rule"], "train_years": delta["train_years"]},
        "b2_thresholds_c": thr,
        "lead_time": "fixed by design: day-ahead (previous_day1) warning available by 18:00 GST on "
                     "D-1, >= 13 h before the first work hour; not a skill metric",
        "train": evaluate_split(TRAIN, pol, thr),
        "holdout_exposed_2025": evaluate_split(HOLDOUT_EXPOSED, pol, thr),
        "holdout_clean_2026": evaluate_split(HOLDOUT_CLEAN, pol, thr),
        "excluded_years": {"2022": "day-ahead RH, pressure, wind, radiation null in Previous Runs API",
                           "2023": "day-ahead RH, pressure, wind, radiation null in Previous Runs API"},
        "limitations": ["airport is not a construction site", "METAR lacks radiation and globe "
                        "temperature; reference radiation comes from the forecast",
                        "Liljegren is a model of WBGT, not a measurement", "one grid point",
                        "no surface heat (asphalt, steel)",
                        "events (level >= 3) cover most work hours, so POD is easy; compare against "
                        "B5_always_work_rest and read FAR, exact agreement and under-warning", "2025 holdout was exposed to an untuned "
                        "planning smoke test"],
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "forecast_eval.json").write_text(json.dumps(result, indent=2, default=str) + "\n")
    print(json.dumps({"delta": delta["delta"], "clean_primary_k3":
                      result["holdout_clean_2026"]["profiles"][PROFILES[0].key]["k3"]}, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
