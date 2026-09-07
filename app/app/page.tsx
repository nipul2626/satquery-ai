import type { Metadata } from "next"
import { Workspace } from "@/components/workspace/workspace"

export const metadata: Metadata = {
  title: "Console — SatQuery AI",
  description:
    "The SatQuery AI analysis console. Ask questions of optical, SAR and before/after satellite imagery and watch a transparent, evidence-grounded agentic reasoning trace.",
}

export default function AppPage() {
  return (
    <main>
      <Workspace />
    </main>
  )
}
