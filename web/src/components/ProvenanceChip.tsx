interface Props { kind: "measured" | "forecast" | "derived" | "fallback"; source: string; detail?: string }

// Every number carries provenance (FR-UI-02). Style encodes kind (doc 04 §3).
export function ProvenanceChip({ kind, source, detail }: Props) {
  const text = `${kind} · ${source}${detail ? ` · ${detail}` : ""}`;
  return <span className={`chip ${kind}`} title={text} tabIndex={0} aria-label={`Provenance: ${text}`}>{kind}</span>;
}

interface ValueProps { value: string | number; unit?: string; kind: Props["kind"]; source: string; detail?: string }
export function Value({ value, unit, kind, source, detail }: ValueProps) {
  return (
    <span className="mono" title={`${kind} · ${source}${detail ? ` · ${detail}` : ""}`}>
      {value}{unit ? ` ${unit}` : ""} <ProvenanceChip kind={kind} source={source} detail={detail} />
    </span>
  );
}
