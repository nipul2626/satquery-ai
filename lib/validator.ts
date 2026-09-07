import type { Scene } from "./types"

export type ValidationResult = {
  ok: boolean
  normalizedQuery: string
  flags: string[]
  /** When ok is false, a user-facing reason. */
  reason?: string
}

const MAX_LEN = 400

/**
 * Deterministic input guard that runs before any model call. It normalizes the
 * query, rejects empties / overlong / obviously out-of-domain input, and flags
 * queries whose requested capability is not available for the chosen scene
 * (e.g. asking for change detection on a single-image scene).
 */
export function validateQuery(rawQuery: string, scene: Scene): ValidationResult {
  const flags: string[] = []
  const normalizedQuery = rawQuery.replace(/\s+/g, " ").trim()

  if (!normalizedQuery) {
    return { ok: false, normalizedQuery, flags: ["empty"], reason: "Enter a question about the imagery." }
  }
  if (normalizedQuery.length > MAX_LEN) {
    return {
      ok: false,
      normalizedQuery: normalizedQuery.slice(0, MAX_LEN),
      flags: ["too-long"],
      reason: `Query exceeds ${MAX_LEN} characters.`,
    }
  }

  const lower = normalizedQuery.toLowerCase()

  // Very light out-of-domain screen: the console only answers questions about
  // the loaded imagery.
  const offTopic = ["weather tomorrow", "stock price", "who are you", "write code", "recipe"]
  if (offTopic.some((p) => lower.includes(p))) {
    flags.push("possibly-out-of-domain")
  }

  // Capability availability against the scene mode.
  const wantsChange = /(chang|before|after|difference|grew|expansion|flood(ed|ing)?|between the two|two dates|over time)/.test(
    lower,
  )
  if (wantsChange && scene.mode !== "bitemporal") {
    flags.push("change-needs-bitemporal")
  }

  const wantsFusion = /(sar|radar|backscatter|fuse|fusion|both sensors|combine.*sensor)/.test(lower)
  if (wantsFusion && scene.modality !== "optical+sar") {
    flags.push("fusion-needs-sar")
  }

  return { ok: true, normalizedQuery, flags }
}
