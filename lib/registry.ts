import type { Intent } from "./types"

/**
 * The specialist registry. The router is a thin lookup over this table: intent
 * classification produces an Intent, and the registry resolves it to a named
 * specialist plus the "tools" that specialist is allowed to invoke. This is the
 * multi-agent structure — adding a capability means adding a row here.
 */
export type SpecialistSpec = {
  intent: Intent
  name: string
  glyph: string
  summary: string
  /** Named retrieval tools this specialist draws evidence from. */
  tools: string[]
  /** Human phrasing of when the router picks this one. */
  triggers: string
  accent: string
}

export const SPECIALISTS: Record<Intent, SpecialistSpec> = {
  caption: {
    intent: "caption",
    name: "Scene Captioner",
    glyph: "text",
    summary: "Produces a holistic natural-language description of the scene.",
    tools: ["caption_store", "landcover_stats"],
    triggers: "describe / summarize / what is this",
    accent: "#22d3ee",
  },
  vqa: {
    intent: "vqa",
    name: "Visual QA",
    glyph: "help",
    summary: "Answers targeted factual questions about scene contents.",
    tools: ["fact_index", "object_detector", "landcover_stats"],
    triggers: "how many / is there / what color / which",
    accent: "#a855f7",
  },
  grounding: {
    intent: "grounding",
    name: "Object Grounding",
    glyph: "target",
    summary: "Localizes a referred region or object and returns its box.",
    tools: ["region_index", "object_detector"],
    triggers: "point to / where is / locate / delineate",
    accent: "#e879f9",
  },
  change: {
    intent: "change",
    name: "Change Detection",
    glyph: "diff",
    summary: "Compares two epochs and quantifies what changed.",
    tools: ["bitemporal_diff", "landcover_stats"],
    triggers: "what changed / before vs after / how much grew",
    accent: "#fbbf24",
  },
  fusion: {
    intent: "fusion",
    name: "Multimodal Fusion",
    glyph: "layers",
    summary: "Combines optical + SAR evidence into a joint interpretation.",
    tools: ["sar_analyzer", "optical_analyzer", "fusion_reasoner"],
    triggers: "combine sensors / SAR vs optical / joint land use",
    accent: "#2dd4bf",
  },
}

export const INTENT_LABELS: Record<Intent, string> = {
  caption: "Scene Captioning",
  vqa: "Visual Question Answering",
  grounding: "Object Grounding",
  change: "Change Detection",
  fusion: "Multimodal Fusion",
}
