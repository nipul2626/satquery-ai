import { Reveal } from "./reveal"
import { ShieldCheck, Route, Boxes, Database, MessagesSquare, Gauge } from "lucide-react"

const STEPS = [
  { icon: ShieldCheck, title: "Input Validation", body: "Normalize the query, guard against empty / out-of-domain input, and flag capabilities the scene can't support." },
  { icon: Route, title: "Intent Classification", body: "A language model routes the question to one of five specialists — with a fallback provider if the primary is down." },
  { icon: Boxes, title: "Specialist Routing", body: "The registry resolves the intent to a named specialist and the evidence tools it is allowed to invoke." },
  { icon: Database, title: "Evidence Retrieval", body: "Relevant facts, objects, regions and change deltas are pulled from the scene's ground-truth store as citations." },
  { icon: MessagesSquare, title: "Grounded Synthesis", body: "The answer is streamed token-by-token, constrained to cite only the retrieved evidence — no invented detail." },
  { icon: Gauge, title: "Confidence & Provenance", body: "A calibrated score, component breakdown, caveats and image provenance are attached to every answer." },
]

export function PipelineSection() {
  return (
    <section id="pipeline" className="relative mx-auto max-w-6xl px-4 py-24">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-violet">The reasoning trace</p>
        <h2 className="mt-3 max-w-2xl text-balance font-display text-4xl font-bold tracking-tight md:text-5xl">
          Six stages you can watch happen
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-muted">
          Nothing is a black box. The console renders each stage live — timings, chosen specialist, retrieved
          citations and all — so you can audit exactly how an answer was formed.
        </p>
      </Reveal>

      <div className="relative mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          return (
            <Reveal key={s.title} delay={i * 0.05}>
              <div className="glass glass-hover relative h-full rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-violet/15 text-brand-violet">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-sm text-muted-2">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
