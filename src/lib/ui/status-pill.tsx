export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "good" | "warn" | "bad" | "neutral" }) {
  const color =
    tone === "good" ? "var(--accent)" : tone === "warn" ? "var(--warning)" : tone === "bad" ? "var(--danger)" : "var(--muted)";

  return (
    <span
      style={{
        border: `1px solid ${color}`,
        color,
        borderRadius: 999,
        padding: "3px 8px",
        fontSize: 12,
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}
