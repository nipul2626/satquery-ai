"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { BENCHMARKS, type ProvenanceStatus } from "@/lib/benchmarks"
import { X, Database, Lock, Globe, FlaskConical } from "lucide-react"

const STATUS_META: Record<ProvenanceStatus, { label: string; color: string; icon: typeof Globe }> = {
  public: { label: "Public benchmark", color: "#22d3ee", icon: Globe },
  hidden: { label: "Hidden — no access", color: "#fbbf24", icon: Lock },
  synthetic: { label: "Synthetic asset", color: "#a855f7", icon: FlaskConical },
}

export function BenchmarksDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-[#02020a]/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="benchmarks-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong relative z-10 my-auto w-full max-w-2xl rounded-3xl p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <span className="brand-gradient inline-flex h-9 w-9 items-center justify-center rounded-xl">
                  <Database className="h-4.5 w-4.5 text-[#05050f]" />
                </span>
                <div>
                  <h2 id="benchmarks-title" className="font-display text-lg font-semibold">
                    Data &amp; Benchmarks
                  </h2>
                  <p className="text-xs text-muted">Task structure references — not training or evaluation data used here</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="glass inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-warning/20 bg-warning/5 p-3 text-[11px] leading-relaxed text-muted">
              Every scene in this console is a{" "}
              <span className="font-semibold text-warning">synthetic demonstration asset</span>. The datasets below
              describe the public research tasks this demo is modeled on. No ISRO/SAC, Cartosat-2S or RISAT data is
              used or accessible here.
            </div>

            <ul className="mt-4 space-y-2.5">
              {BENCHMARKS.map((b) => {
                const meta = STATUS_META[b.status]
                const Icon = meta.icon
                return (
                  <li key={b.id} className="glass rounded-2xl p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-semibold text-foreground">{b.name}</p>
                        {b.citation && <p className="mt-0.5 font-mono text-[10px] text-muted-2">{b.citation}</p>}
                      </div>
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px]"
                        style={{ borderColor: `${meta.color}55`, color: meta.color, background: `${meta.color}12` }}
                      >
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </div>
                    <dl className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                      {[
                        ["Purpose", b.purpose],
                        ["Task", b.task],
                        ["Modality", b.modality],
                        ["Source", b.source],
                      ].map(([k, v]) => (
                        <div key={k} className="flex gap-2 text-[11px]">
                          <dt className="w-16 shrink-0 font-mono uppercase tracking-wide text-muted-2">{k}</dt>
                          <dd className="text-foreground/85">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 border-t border-white/8 pt-2 text-[11px] leading-relaxed text-muted">
                      {b.statusNote}
                    </p>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
