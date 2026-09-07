"use client"

import { useSatStore } from "@/lib/store"
import { Satellite, MapPin, Ruler, Clock, ShieldCheck } from "lucide-react"

export function SceneInspector() {
  const scene = useSatStore((s) => s.scene)
  const rows = [
    { icon: Satellite, label: "Sensor", value: scene.sensor },
    { icon: MapPin, label: "Location", value: scene.location },
    { icon: Ruler, label: "Resolution", value: scene.gsd },
    { icon: Clock, label: "Captured", value: scene.captured },
  ]

  return (
    <div>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-2">Scene details</h2>
      <div className="glass rounded-2xl p-4">
        <p className="font-display text-base font-semibold">{scene.title}</p>
        <p className="mt-0.5 text-xs text-muted">{scene.subtitle}</p>

        <dl className="mt-4 space-y-2.5">
          {rows.map((r) => {
            const Icon = r.icon
            return (
              <div key={r.label} className="flex items-start gap-2.5 text-xs">
                <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-cyan" />
                <dt className="w-20 shrink-0 text-muted-2">{r.label}</dt>
                <dd className="text-foreground/90">{r.value}</dd>
              </div>
            )
          })}
        </dl>

        <div className="mt-4 rounded-xl border border-warning/20 bg-warning/5 p-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-warning" />
            <span className="text-xs font-semibold text-warning">Provenance</span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{scene.provenance.note}</p>
          <p className="mt-1.5 font-mono text-[10px] text-muted-2">
            {scene.provenance.source} · {scene.provenance.license}
          </p>
        </div>
      </div>
    </div>
  )
}
