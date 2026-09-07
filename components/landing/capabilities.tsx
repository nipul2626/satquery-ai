import { SPECIALISTS, INTENT_LABELS } from "@/lib/registry"
import { IntentGlyph } from "@/components/intent-glyph"
import { Reveal } from "./reveal"
import type { Intent } from "@/lib/types"

const ORDER: Intent[] = ["caption", "vqa", "grounding", "change", "fusion"]

export function Capabilities() {
  return (
    <section id="capabilities" className="mx-auto max-w-6xl px-4 py-24">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-cyan">Five specialists · one router</p>
        <h2 className="mt-3 max-w-2xl text-balance font-display text-4xl font-bold tracking-tight md:text-5xl">
          A vision-language toolkit for Earth observation
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-muted">
          Remote sensing isn&apos;t one task. SatQuery treats each question as a routing decision and hands it to the
          specialist built to answer it.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ORDER.map((intent, i) => {
          const s = SPECIALISTS[intent]
          return (
            <Reveal key={intent} delay={i * 0.06}>
              <article className="glass glass-hover h-full rounded-2xl p-6">
                <span
                  className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${s.accent}1f`, color: s.accent }}
                >
                  <IntentGlyph intent={intent} className="h-5 w-5" />
                </span>
                <h3 className="font-display text-lg font-semibold">{INTENT_LABELS[intent]}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.summary}</p>
                <p className="mt-4 font-mono text-xs text-muted-2">
                  triggers: <span className="text-foreground/70">{s.triggers}</span>
                </p>
              </article>
            </Reveal>
          )
        })}

        <Reveal delay={0.3}>
          <article className="glass h-full rounded-2xl border-brand-violet/30 p-6">
            <h3 className="font-display text-lg font-semibold">Grounded by design</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Every specialist answers only from a curated evidence store, cites the exact objects and regions it used,
              and reports calibrated confidence with explicit caveats.
            </p>
          </article>
        </Reveal>
      </div>
    </section>
  )
}
