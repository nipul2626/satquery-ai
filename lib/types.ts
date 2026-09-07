export type SceneMode = "single" | "pair" | "bitemporal"

export type Modality = "optical" | "optical+sar"

export type WorldBody = "earth" | "moon"

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
 * Normalized geometry uses 0..1 coordinates relative to the active image.
 */
export type OverlayGeometry =
    | {
  type: "point"
  points: [{ x: number; y: number }]
}
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
  availableIntents: Intent[]
  evidence: EvidenceStore
}

export type ProviderId =
    | "groq"
    | "gemini"
    | "offline"

export type QueryOperation =
    | "describe"
    | "count"
    | "identify"
    | "rank"
    | "measure"
    | "compare"
    | "change"
    | "fusion"
    | "explain"
    | "answer"

export type RankingProperty =
    | "area"
    | "length"
    | "depth"
    | "distance"
    | "brightness"
    | null

export type MeasurementType =
    | "length"
    | "diameter"
    | "width"
    | "height"
    | "depth"
    | "distance"
    | "area"
    | "count"
    | "none"

export type RequestedModality =
    | "auto"
    | "optical"
    | "sar"
    | "both"

export type QueryPlan = {
  operation: QueryOperation
  targetHint: string | null
  regionHint: string | null
  spatialRelation: string | null
  ordinal: number | null
  ranking: RankingProperty
  measurement: MeasurementType
  requestedModality: RequestedModality
  requiresGrounding: boolean
  requiresComparison: boolean
  requiresMeasurement: boolean
  requiresCandidateSearch: boolean
}

export type VisualGeometryType =
    | "point"
    | "bbox"
    | "line"
    | "polygon"

export type VisualFinding = {
  id: string
  label: string
  description: string
  geometryType: VisualGeometryType
  bbox: BBox | null
  points: { x: number; y: number }[]
  target:
      | "optical"
      | "sar"
      | "before"
      | "after"
      | "both"
  confidence: number
  selected: boolean
}

export type RankedCandidate = {
  id: string
  rank: number
  label: string
  bbox: BBox | null
  points: { x: number; y: number }[]
  geometryType: VisualGeometryType
  target:
      | "optical"
      | "sar"
      | "before"
      | "after"
      | "both"
  confidence: number
}

export type MeasurementResult = {
  requested: MeasurementType
  value: number | null
  unit: string | null
  status:
      | "evidence"
      | "visual-estimate"
      | "unsupported"
  confidence: number
  caveat: string | null
}

export type VisualAnalysisResult = {
  answer: string
  findings: VisualFinding[]
  rankedCandidates: RankedCandidate[]
  selectedFindingId: string | null
  measurement: MeasurementResult
  observations: string[]
  confidence: number
}

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
  bbox?: BBox
  overlay?: OverlayGeometry

  target?:
      | "optical"
      | "sar"
      | "before"
      | "after"
      | "both"

  source?: "evidence" | "vision"
  role?: "support" | "target" | "candidate"
  confidence?: number
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

export type AnalyzeResult = {
  ok: boolean
  provider: ProviderId
  intent: Intent
  intentLabel: string
  intentRationale: string
  routedSpecialist: string
  queryPlan: QueryPlan

  validation: {
    ok: boolean
    normalizedQuery: string
    flags: string[]
  }

  citations: Citation[]
  confidence: ConfidenceBreakdown
  provenance: Provenance
  trace: TraceStep[]
  offlineAnswer: string
}

export type SynthesisResponse = {
  ok: boolean
  provider: ProviderId
  answer: string
  citations: Citation[]
  visualAnalysis: VisualAnalysisResult | null
  confidence: number
}
