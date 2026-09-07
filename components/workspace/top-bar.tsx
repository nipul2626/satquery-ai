"use client"

import Link from "next/link"
import { Logo } from "@/components/logo"
import { ProviderPill } from "./provider-pill"
import { useSatStore } from "@/lib/store"
import type { SceneMode } from "@/lib/types"
import { Database, ArrowLeft, Image as ImageIcon, Layers, GitCompareArrows } from "lucide-react"

const MODES: { mode: SceneMode; label: string; short: string; icon: typeof ImageIcon }[] = [
  { mode: "single", label: "Single Image", short: "Single", icon: ImageIcon },
  { mode: "pair", label: "Optical + SAR Pair", short: "Fusion", icon: Layers },
  { mode: "bitemporal", label: "Before / After Pair", short: "Change", icon: GitCompareArrows },
]

export function TopBar({ onOpenBenchmarks }: { onOpenBenchmarks: () => void }) {
  const scene = useSatStore((s) => s.scene)
  const setMode = useSatStore((s) => s.setMode)
  const provider = useSatStore((s) => s.provider)
  const status = useSatStore((s) => s.status)

  const pending = status === "classifying" || status === "validating"

  return (
    <header className="glass-strong sticky top-0 z-40 flex items-center justify-between gap-4 rounded-2xl px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="glass inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:text-foreground"
          aria-label="Back to landing page"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <Logo className="hidden sm:flex" />
      </div>

      {/* Mode selector */}
      <div
        role="radiogroup"
        aria-label="Input mode"
        className="glass flex items-center gap-1 rounded-full p-1"
      >
        {MODES.map((m) => {
          const active = scene.mode === m.mode
          const Icon = m.icon
          return (
            <button
              key={m.mode}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMode(m.mode)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                active ? "text-[#05050f]" : "text-muted hover:text-foreground"
              }`}
              style={active ? { background: "linear-gradient(135deg,#22d3ee,#a855f7)" } : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{m.label}</span>
              <span className="md:hidden">{m.short}</span>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden lg:block">
          <ProviderPill provider={provider} pending={pending} />
        </div>
        <button
          type="button"
          onClick={onOpenBenchmarks}
          className="glass glass-hover inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-foreground"
        >
          <Database className="h-4 w-4 text-brand-cyan" />
          <span className="hidden sm:inline">Data &amp; Benchmarks</span>
        </button>
      </div>
    </header>
  )
}
