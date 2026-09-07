"use client"

import { useState } from "react"
import Image from "next/image"
import { SCENES } from "@/lib/scenes"
import { useSatStore } from "@/lib/store"
import type { WorldBody } from "@/lib/types"
import { Layers, GitCompareArrows, Image as ImageIcon, Globe, Moon } from "lucide-react"

const WORLDS: { id: WorldBody; label: string; icon: typeof Globe }[] = [
  { id: "earth", label: "Earth", icon: Globe },
  { id: "moon", label: "Moon", icon: Moon },
]

function modeIcon(mode: string) {
  if (mode === "bitemporal") return GitCompareArrows
  if (mode === "pair") return Layers
  return ImageIcon
}

function thumb(scene: (typeof SCENES)[number]): string {
  return scene.images.optical ?? scene.images.after ?? scene.images.before ?? ""
}

export function SceneGallery() {
  const scene = useSatStore((s) => s.scene)
  const setScene = useSatStore((s) => s.setScene)
  const status = useSatStore((s) => s.status)
  const busy = status !== "idle" && status !== "done" && status !== "error"

  const [body, setBody] = useState<WorldBody>(scene.body)
  const visible = SCENES.filter((s) => s.body === body)

  const switchBody = (next: WorldBody) => {
    if (next === body || busy) return
    setBody(next)
    const first = SCENES.find((s) => s.body === next)
    if (first) setScene(first)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-2">Scenes</h2>
        <div
          className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5"
          role="tablist"
          aria-label="Select world"
        >
          {WORLDS.map((w) => {
            const Icon = w.icon
            const active = w.id === body
            return (
              <button
                key={w.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={busy}
                onClick={() => switchBody(w.id)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  active
                    ? "bg-brand-violet/20 text-foreground ring-1 ring-brand-violet/50"
                    : "text-muted-2 hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {w.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {visible.map((s) => {
          const Icon = modeIcon(s.mode)
          const active = s.id === scene.id
          return (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => setScene(s)}
              aria-pressed={active}
              className={`group relative overflow-hidden rounded-xl text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                active ? "ring-2 ring-brand-violet" : "ring-1 ring-white/10 hover:ring-white/25"
              }`}
            >
              <div className="relative aspect-[4/3] w-full">
                <Image src={thumb(s) || "/placeholder.svg"} alt={s.title} fill sizes="200px" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#05050f] via-[#05050f]/30 to-transparent" />
                <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-[#05050f]/70 px-1.5 py-0.5 font-mono text-[10px] text-brand-cyan">
                  <Icon className="h-3 w-3" />
                  {s.modality === "optical+sar" ? "O+SAR" : s.mode === "bitemporal" ? "T0/T1" : "OPT"}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-2">
                <p className="truncate text-xs font-semibold text-foreground">{s.title}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
