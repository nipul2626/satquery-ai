"use client"

import { motion } from "motion/react"
import { useSatStore } from "@/lib/store"
import { SPECIALISTS } from "@/lib/registry"
import { IntentGlyph } from "@/components/intent-glyph"
import type { Intent } from "@/lib/types"

const ORDER: Intent[] = ["caption", "vqa", "grounding", "change", "fusion"]

export function SpecialistStrip() {
  const scene = useSatStore((s) => s.scene)
  const active = useSatStore((s) => s.intent)

  return (
    <div>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-2">Specialists</h2>
      <div className="grid grid-cols-5 gap-1.5">
        {ORDER.map((intent) => {
          const spec = SPECIALISTS[intent]
          const isActive = active === intent
          const available = scene.availableIntents.includes(intent)
          return (
            <div
              key={intent}
              title={`${spec.name} — ${spec.summary}`}
              className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 transition-all ${
                isActive ? "border-transparent" : "border-white/8"
              } ${available ? "" : "opacity-35"}`}
              style={
                isActive
                  ? { background: `${spec.accent}18`, boxShadow: `inset 0 0 0 1px ${spec.accent}, 0 0 18px -6px ${spec.accent}` }
                  : undefined
              }
            >
              {isActive && (
                <motion.span
                  layoutId="specialist-active"
                  className="absolute -top-1 h-1 w-6 rounded-full"
                  style={{ background: spec.accent }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span style={{ color: isActive ? spec.accent : "var(--muted)" }}>
                <IntentGlyph intent={intent} className="h-4 w-4 transition-colors" />
              </span>
              <span
                className="text-center font-mono text-[9px] leading-tight"
                style={{ color: isActive ? spec.accent : "var(--muted-2)" }}
              >
                {spec.name.split(" ")[0]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
