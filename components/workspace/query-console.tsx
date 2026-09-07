"use client"

import { useState } from "react"
import { useSatStore } from "@/lib/store"
import { SendHorizonal, Sparkles } from "lucide-react"

export function QueryConsole() {
  const scene = useSatStore((s) => s.scene)
  const status = useSatStore((s) => s.status)
  const run = useSatStore((s) => s.run)
  const [value, setValue] = useState("")

  const busy = status !== "idle" && status !== "done" && status !== "error"

  const submit = (q: string) => {
    const query = q.trim()
    if (!query || busy) return
    setValue(query)
    void run(query)
  }

  return (
    <div>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-2">Ask the imagery</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(value)
        }}
        className="glass flex items-center gap-2 rounded-2xl p-2"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              submit(value)
            }
          }}
          disabled={busy}
          placeholder="e.g. How many ships are in the harbor?"
          aria-label="Ask a question about the scene"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-2 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="brand-gradient inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#05050f] transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send query"
        >
          <SendHorizonal className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-muted-2">
          <Sparkles className="h-3 w-3 text-brand-cyan" />
          Try
        </span>
        {scene.suggestedQueries.slice(0, 4).map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => submit(q)}
            className="glass glass-hover rounded-full px-3 py-1 text-xs text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
