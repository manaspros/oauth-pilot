import { listGuides } from "@oauth-pilot/agent";
import { Library } from "@/components/Library";
import { SubmitBox } from "@/components/SubmitBox";
import { summarize } from "@/lib/summary";

export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await listGuides();
  const guides = entries
    .map((e) => summarize(e.slug, e.guide, e.source))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  return (
    <>
      <section className="pt-14">
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          How hard is it to get your OAuth app approved?
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          Get the real critical path for any provider: what to start today, what you will wait on, and which
          claims are sourced, tested or guessed.
        </p>
        <div className="mt-8">
          <SubmitBox />
        </div>
      </section>
      <Library guides={guides} />
    </>
  );
}
