import { Layers, Crosshair, GitCompareArrows, HelpCircle, AlignLeft, type LucideIcon } from "lucide-react"
import type { Intent } from "@/lib/types"

const MAP: Record<Intent, LucideIcon> = {
  caption: AlignLeft,
  vqa: HelpCircle,
  grounding: Crosshair,
  change: GitCompareArrows,
  fusion: Layers,
}

export function IntentGlyph({ intent, className = "" }: { intent: Intent; className?: string }) {
  const Icon = MAP[intent]
  return <Icon className={className} aria-hidden="true" />
}
