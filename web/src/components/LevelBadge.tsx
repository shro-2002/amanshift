import { useI18n, type Key } from "../i18n/i18n";

// Shape + number + word, never colour alone (doc 04 §3).
const SHAPES: Record<number, { glyph: string; label: string }> = {
  1: { glyph: "●", label: "circle" }, 2: { glyph: "▲", label: "triangle" },
  3: { glyph: "◆", label: "diamond" }, 4: { glyph: "⬢", label: "octagon" },
};

interface Props { level: number; degraded?: boolean; size?: "sm" | "lg"; english?: boolean }

export function LevelBadge({ level, degraded = false, size = "sm", english = false }: Props) {
  const { t } = useI18n();
  const key = `level_${level}` as Key;
  const word = english ? ["", "STANDARD", "INCREASED CARE", "WORK / REST", "STOP"][level] : t(key);
  return (
    <span className={`badge sev-${level} ${size === "lg" ? "lg" : ""} ${degraded ? "degraded" : ""}`}
      aria-label={`Level ${level} ${word}${degraded ? ", conservative because data degraded" : ""}`}>
      <span aria-hidden="true">{SHAPES[level].glyph}</span>
      <span className="num" aria-hidden="true">{level}</span>
      <span aria-hidden="true">{word}</span>
    </span>
  );
}
