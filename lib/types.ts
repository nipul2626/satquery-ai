export type SceneMode = "single" | "pair" | "bitemporal"

export type Modality = "optical" | "optical+sar"

/**
 * Planetary body a scene belongs to.
 * Typed as a union so more can be added later.
 */
export type WorldBody = "earth" | "moon"

/**
 * The five specialist capabilities the router can dispatch to.
 */
export type Intent =
    | "caption"
    | "vqa"
    | "grounding"
    | "change"
    | "fusion"

export type BBox = {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Custom visual geometry for elongated or irregular features.
 *
 * A line is useful for:
 * - bridges
 * - roads
 * - rivers
 * - channels
 *
 * A polygon is useful for:
 * - regions
 * - land-cover areas
 * - change regions
 */
export type OverlayGeometry =
    | {
  type: "line"
  points: { x: number; y: number }[]
  strokeWidth?: number
}
    | {
  type: "polygon"
  points: { x: number; y: number }[]
  strokeWidth?: number
}

export type DetectedObject = {
  label: string
  count: number
  bbox: BBox
  overlay?: OverlayGeometry
  note?: string
}

export type LandCoverClass = {
  class: string
  percent: number
  color: string
}

export type GroundRegion = {
  id: string
  label: string
  synonyms: string[]
  bbox: BBox
  overlay?: OverlayGeometry
  note?: string
}

export type ChangeRegion = {
  label: string
  bbox: BBox
  overlay?: OverlayGeometry
  direction:
      | "increase"
      | "decrease"
      | "new"
      | "removed"
  deltaPercent: number
  note: string
}

export type EvidenceStore = {
  caption: string

  facts: {
    q: string
    a: string
    keywords: string[]
  }[]

  objects: DetectedObject[]

  landCover: LandCoverClass[]

  regions: GroundRegion[]

  changes?: ChangeRegion[]

  fusionNotes?: string[]

  /**
   * Baseline confidence assigned to each intent
   * for this particular scene.
   */
  baseConfidence: Record<Intent, number>
}

export type Provenance = {
  source: string
  sourceUrl?: string
  license: string
  synthetic: boolean
  note: string
}

export type SceneImages = {
  optical?: string
  sar?: string
  before?: string
  after?: string
}

export type Scene = {
  id: string
  body: WorldBody
  title: string
  subtitle: string
  mode: SceneMode
  modality: Modality
  images: SceneImages
  location: string
  sensor: string
  captured: string
  gsd: string
  provenance: Provenance
  suggestedQueries: string[]

  /**
   * Intents that make sense to offer for this scene.
   */
  availableIntents: Intent[]

  evidence: EvidenceStore
}

/**
 * IMPORTANT:
 *
 * "groq" means the actual Groq synthesis provider.
 * "gemini" means the actual Gemini synthesis provider.
 * "offline" means the deterministic local fallback.
 *
 * Local intent routing is NOT represented here as a provider.
 */
export type ProviderId =
    | "groq"
    | "gemini"
    | "offline"

export type TraceStatus =
    | "pending"
    | "running"
    | "done"
    | "skipped"

export type TraceStep = {
  id: string
  label: string
  detail: string
  status: TraceStatus
  durationMs?: number

  /**
   * Optional machine-readable payload rendered as chips.
   */
  meta?: {
    label: string
    value: string
  }[]
}

export type Citation = {
  id: string

  kind:
      | "caption"
      | "object"
      | "landcover"
      | "region"
      | "change"
      | "fusion"

  label: string

  detail: string

  /**
   * Generic rectangular spatial extent.
   */
  bbox?: BBox

  /**
   * Optional custom geometry.
   *
   * This is what allows the UI to draw the actual bridge
   * as a line instead of putting a rectangle around it.
   */
  overlay?: OverlayGeometry

  /**
   * Which image the citation belongs to.
   */
  target?:
      | "optical"
      | "sar"
      | "before"
      | "after"
}

export type ConfidenceBreakdown = {
  overall: number

  components: {
    label: string
    value: number
    note: string
  }[]

  caveats: string[]
}

/**
 * Full structured result of the analyze phase.
 *
 * This contains everything except the final streamed/generated
 * answer text.
 */
export type AnalyzeResult = {
  ok: boolean

  /**
   * This is retained for compatibility with the analysis API.
   *
   * IMPORTANT:
   * The final synthesis provider is determined by /api/synthesize.
   */
  provider: ProviderId

  intent: Intent

  intentLabel: string

  intentRationale: string

  routedSpecialist: string

  validation: {
    ok: boolean
    normalizedQuery: string
    flags: string[]
  }

  citations: Citation[]

  confidence: ConfidenceBreakdown

  provenance: Provenance

  trace: TraceStep[]

  /**
   * Grounded answer used only if both external
   * model providers are unavailable.
   */
  offlineAnswer: string
}