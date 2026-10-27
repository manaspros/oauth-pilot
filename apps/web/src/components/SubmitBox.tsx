"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SubmitBox() {
  const router = useRouter();
  const [app, setApp] = useState("");
  const [useCase, setUseCase] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!app.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ app: app.trim(), ...(useCase.trim() ? { useCase: useCase.trim() } : {}) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
      router.push(`/runs/${body.runId}`);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="app">App name or website</label>
        <input
          id="app"
          value={app}
          onChange={(e) => setApp(e.target.value)}
          placeholder="App name or website, e.g. Calendly"
          className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2.5 text-base"
        />
        <button
          type="submit"
          disabled={busy || !app.trim()}
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-50"
        >
          {busy ? "Starting…" : "Generate guide"}
        </button>
      </div>
      <label className="sr-only" htmlFor="usecase">What will your agent do?</label>
      <input
        id="usecase"
        value={useCase}
        onChange={(e) => setUseCase(e.target.value)}
        placeholder="What will your agent do? (optional)"
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm"
      />
      {err && <p role="alert" className="text-sm" style={{ color: "var(--tier-4)" }}>{err}</p>}
    </form>
  );
}
