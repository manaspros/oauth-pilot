export function StartToday({ text }: { text: string }) {
  return (
    <section
      data-testid="start-today"
      aria-label="Start today"
      className="rounded-lg border border-line bg-surface p-5"
      style={{ borderLeft: "4px solid var(--accent)" }}
    >
      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
        Start today
      </div>
      <p className="mt-1.5 text-lg font-medium leading-snug">{text}</p>
    </section>
  );
}
