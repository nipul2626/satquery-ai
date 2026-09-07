"use client"

import { useSatStore } from "@/lib/store"
import { SPECIALISTS } from "@/lib/registry"
import { History } from "lucide-react"

export function HistoryList() {
  const history = useSatStore((s) => s.history)
  const restore = useSatStore((s) => s.restoreFromHistory)
  const currentQuery = useSatStore((s) => s.query)
  const status = useSatStore((s) => s.status)

  if (history.length === 0) return null

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.18em] text-muted-2">
        <History className="h-3.5 w-3.5" />
        Session history
      </h2>
      <ul className="space-y-1.5">
        {history.map((rec) => {
          const accent = SPECIALISTS[rec.intent].accent
          const active = status === "done" && rec.query === currentQuery
          return (
            <li key={rec.id}>
              <button
                type="button"
                onClick={() => restore(rec)}
                className={`glass glass-hover flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ${
                  active ? "ring-1 ring-brand-violet/60" : ""
                }`}
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 6px ${accent}` }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-foreground">{rec.query}</span>
                  <span className="font-mono text-[10px] text-muted-2">
                    {rec.intentLabel} · {Math.round(rec.confidence.overall * 100)}%
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
