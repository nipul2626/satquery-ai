import { Reveal } from "./reveal"
import { Zap, GitBranch, ShieldAlert } from "lucide-react"

export function ArchitectureSection() {
  return (
    <section id="architecture" className="mx-auto max-w-6xl px-4 py-24">
      <div className="glass-strong overflow-hidden rounded-3xl p-8 md:p-12">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-cyan">Architecture</p>
          <h2 className="mt-3 max-w-2xl text-balance font-display text-4xl font-bold tracking-tight md:text-5xl">
            Fast primary, graceful fallback
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-muted">
            Requests are routed through the Vercel AI Gateway. Classification and synthesis run on Groq for low latency;
            if Groq is unreachable, SatQuery transparently retries on Google Gemini, and if both are down it degrades to
            a deterministic answer composed straight from the evidence store.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Reveal delay={0.05}>
            <div className="glass h-full rounded-2xl p-6">
              <Zap className="h-6 w-6 text-brand-cyan" />
              <h3 className="mt-4 font-display font-semibold">Primary · Groq</h3>
              <p className="mt-2 text-sm text-muted">
                Llama 3.3 70B via gateway provider routing pinned to Groq for sub-second token latency.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="glass h-full rounded-2xl p-6">
              <GitBranch className="h-6 w-6 text-brand-violet" />
              <h3 className="mt-4 font-display font-semibold">Fallback · Gemini</h3>
              <p className="mt-2 text-sm text-muted">
                Google Gemini 2.5 Flash takes over automatically on any primary failure — the console shows which
                provider actually served each answer.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.19}>
            <div className="glass h-full rounded-2xl p-6">
              <ShieldAlert className="h-6 w-6 text-warning" />
              <h3 className="mt-4 font-display font-semibold">Offline · Deterministic</h3>
              <p className="mt-2 text-sm text-muted">
                If no model is reachable, answers are composed directly from retrieved citations, so a live demo never
                hard-fails.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
