"""FR-GOV-01 / RB6 / RB7: no personal identifiers, biometrics or locations; no banned wording."""

from __future__ import annotations

import re
from pathlib import Path

from amanshift.engine import models

BANNED_FIELDS = re.compile(r"(name|phone|email|employee|passport|heart_?rate|biometric|latitude|longitude|"
                           r"gps|photo|birth|nationality|worker_id|person_id)", re.I)
BANNED_WORDS = re.compile(r"safe[ _]to[ _]work|\bcleared\b|\bauthori[sz]ed\b|measured wbgt estimate", re.I)
ROOT = Path(__file__).resolve().parents[3]


def test_schema_has_no_personal_fields() -> None:
    for cls in (models.Crew, models.Resource, models.EnvEvidence, models.Snapshot, models.PlanAction,
                models.Plan, models.Provenance, models.SiteGraph):
        for field in cls.model_fields:
            assert not BANNED_FIELDS.search(field), f"{cls.__name__}.{field}"


def test_no_banned_wording_in_code_or_ui_strings() -> None:
    paths = [*(ROOT / "backend" / "amanshift").rglob("*.py"), *(ROOT / "backend" / "amanshift_checker").rglob("*.py")]
    paths += [*(ROOT / "web" / "src").rglob("*.ts*"), *(ROOT / "web" / "src").rglob("*.json")]
    for p in paths:
        text = p.read_text(encoding="utf-8")
        assert not BANNED_WORDS.search(text), p
