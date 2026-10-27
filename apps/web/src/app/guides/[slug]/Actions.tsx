"use client";
import { useState } from "react";

export function Actions({ slug, generatedAt, model }: { slug: string; generatedAt: string; model: string }) {
  const [msg, setMsg] = useState("");
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2000); };
  const copy = async (text: string, ok: string) => {
    try { await navigator.clipboard.writeText(text); flash(ok); } catch { flash("Copy failed"); }
  };
  const btn = "rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-accent";
  return (
    <footer className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-5">
      <button
        className={btn}
        onClick={async () => {
          try {
            const r = await fetch(`/api/guides/${slug}/markdown`);
            await copy(await r.text(), "Markdown copied");
          } catch { flash("Copy failed"); }
        }}
      >
        Copy as markdown
      </button>
      <button className={btn} onClick={() => copy(window.location.href, "Link copied")}>Copy link</button>
      <a className={btn} href={`/?regenerate=${encodeURIComponent(slug)}`}>Regenerate</a>
      <span role="status" className="text-sm" style={{ color: "var(--tier-0)" }}>{msg}</span>
      <span className="ml-auto font-mono text-xs text-muted">generated {generatedAt.slice(0, 10)} · {model}</span>
    </footer>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      aria-label={`${label} ${text}`}
      className="rounded border border-line px-2 py-0.5 text-xs"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {}
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}
