"use client"

import { motion, AnimatePresence } from "motion/react"
import { useSatStore } from "@/lib/store"
import { SPECIALISTS, INTENT_LABELS } from "@/lib/registry"
import type { TraceStatus } from "@/lib/types"
import { Check, Loader2, Circle, Minus } from "lucide-react"

function StatusIcon({ status, accent }: { status: TraceStatus; accent: string }) {
  if (status === "running")
    return <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: accent }} />
  if (status === "done") return <Check className="h-3.5 w-3.5 text-success" />
  if (status === "skipped") return <Minus className="h-3.5 w-3.5 text-muted-2" />
  return <Circle className="h-2.5 w-2.5 text-muted-2" />
}

export function ExecutionTrace() {
  const trace = useSatStore((s) => s.trace)
  const intent = useSatStore((s) => s.intent)
  const intentLabel = useSatStore((s) => s.intentLabel)
  const status = useSatStore((s) => s.status)

  const accent = intent ? SPECIALISTS[intent].accent : "#22d3ee"
  const started = status !== "idle"

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-2">Execution trace</h2>
        {intent && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px]"
            style={{ borderColor: `${accent}55`, color: accent, background: `${accent}12` }}
          >
            {intentLabel ?? INTENT_LABELS[intent]}
          </span>
        )}
      </div>

      {!started ? (
        <p className="glass rounded-2xl p-4 text-xs leading-relaxed text-muted-2">
          Observable pipeline operations appear here as your query runs — validation, routing, retrieval and
          grounded synthesis. No hidden monologue, only real steps.
        </p>
      ) : (
        <ol className="glass rounded-2xl p-2">
          <AnimatePresence initial={false}>
            {trace.map((step, i) => {
              const stepAccent = step.id === "classify" || step.id === "route" ? accent : "#22d3ee"
              return (
                <motion.li
                  key={step.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className={`flex items-start gap-3 rounded-xl px-2.5 py-2 ${
                    step.status === "running" ? "bg-white/[0.03]" : ""
                  }`}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                    <StatusIcon status={step.status} accent={stepAccent} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={`text-xs font-medium ${
                          step.status === "pending" ? "text-muted-2" : "text-foreground"
                        }`}
                      >
                        {step.label}
                      </p>
                      {typeof step.durationMs === "number" && step.status === "done" && (
                        <span className="shrink-0 font-mono text-[10px] text-muted-2">{step.durationMs}ms</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted">{step.detail}</p>
                    {step.meta && step.meta.length > 0 && step.status === "done" && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {step.meta.map((m) => (
                          <span
                            key={m.label}
                            className="rounded-md bg-white/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted"
                          >
                            {m.label}: <span className="text-foreground/80">{m.value}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  )
}
