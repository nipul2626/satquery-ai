import type {
  Citation,
  ConfidenceBreakdown,
  Intent,
  Scene,
} from "./types"
import { INTENT_LABELS } from "./registry"

/**
 * Evidence retrieval.
 *
 * Given a scene, an intent and the query, retrieve the most relevant
 * ground-truth evidence from the scene's EvidenceStore.
 *
 * IMPORTANT:
 * The EvidenceStore remains authoritative for curated quantitative facts,
 * while the AI model is also allowed to inspect the actual imagery during
 * synthesis.
 */
export function retrieveCitations(
    scene: Scene,
    intent: Intent,
    query: string,
): Citation[] {
  const q = query.toLowerCase()
  const ev = scene.evidence
  const cites: Citation[] = []

  const targetBefore =
      scene.mode === "bitemporal" ? ("before" as const) : undefined

  const targetAfter =
      scene.mode === "bitemporal" ? ("after" as const) : undefined

  const opticalTarget =
      scene.mode === "pair" ? ("optical" as const) : undefined

  /**
   * Scene Captioning
   */
  if (intent === "caption") {
    cites.push({
      id: "cap",
      kind: "caption",
      label: "Scene caption",
      detail: ev.caption,
      target: targetAfter ?? opticalTarget,
    })

    ev.landCover.slice(0, 3).forEach((lc, i) => {
      cites.push({
        id: `lc-${i}`,
        kind: "landcover",
        label: lc.class,
        detail: `${lc.percent}% of scene`,
        target: targetAfter ?? opticalTarget,
      })
    })
  }

  /**
   * Visual Question Answering
   */
  if (intent === "vqa") {
    // Normalize the query so matching is consistent.
    const normalizedQuery = q
        .replace(/[?.,!]/g, " ")
        .replace(/\s+/g, " ")
        .trim()

    /**
     * Rank factual evidence by keyword overlap with the user's query.
     */
    const ranked = [...ev.facts]
        .map((f) => ({
          f,
          score: f.keywords.reduce(
              (s, k) =>
                  normalizedQuery.includes(k.toLowerCase()) ? s + 1 : s,
              0,
          ),
        }))
        .sort((a, b) => b.score - a.score)

    const chosen = ranked[0]?.score
        ? ranked.filter((r) => r.score > 0).slice(0, 2)
        : ranked.slice(0, 1)

    chosen.forEach((r, i) => {
      cites.push({
        id: `fact-${i}`,
        kind: "caption",
        label: "Fact",
        detail: r.f.a,
        target: opticalTarget,
      })
    })

    /**
     * Attach ONLY objects explicitly relevant to the user's question.
     *
     * IMPORTANT:
     * The old implementation contained:
     *
     *   || Boolean(ranked[0]?.score)
     *
     * That meant that if ANY fact matched, unrelated objects were also
     * attached. For example:
     *
     *   "Is there a bridge?"
     *
     * could retrieve both:
     *
     *   Road bridge
     *   Moored vessel
     *
     * even though the user never asked about vessels.
     *
     * We now match object labels and notes directly against the query.
     */
    const matchedObjects = ev.objects.filter((o) => {
      const label = o.label.toLowerCase()
      const note = (o.note ?? "").toLowerCase()

      /**
       * Words from the object's label.
       *
       * Example:
       *   "Road bridge"
       * becomes:
       *   ["road", "bridge"]
       */
      const labelWords = label
          .split(/\s+/)
          .map((word) => word.replace(/[^a-z0-9]/g, ""))
          .filter((word) => word.length >= 3)

      /**
       * Direct label matching.
       *
       * "bridge" matches "Road bridge".
       */
      const labelMatch = labelWords.some((word) => {
        if (normalizedQuery.includes(word)) {
          return true
        }

        /**
         * Basic singular/plural matching.
         *
         * "ship" ↔ "ships"
         * "vessel" ↔ "vessels"
         */
        if (
            word.endsWith("s") &&
            word.length > 3 &&
            normalizedQuery.includes(word.slice(0, -1))
        ) {
          return true
        }

        if (
            !word.endsWith("s") &&
            normalizedQuery.includes(`${word}s`)
        ) {
          return true
        }

        return false
      })

      /**
       * Also check the object's descriptive note.
       *
       * This allows questions to match useful descriptive terms
       * even when the exact label isn't present.
       */
      const noteWords = note
          .split(/\s+/)
          .map((word) => word.replace(/[^a-z0-9]/g, ""))
          .filter((word) => word.length >= 4)

      const noteMatch = noteWords.some((word) =>
          normalizedQuery.includes(word),
      )

      return labelMatch || noteMatch
    })

    /**
     * Only matched objects are added.
     *
     * If the question is about a bridge:
     *
     *   matchedObjects = [Road bridge]
     *
     * The vessel will NOT be added merely because another fact matched.
     */
    matchedObjects.slice(0, 2).forEach((o, i) => {
      cites.push({
        id: `obj-${i}`,
        kind: "object",
        label: o.label,
        detail: o.note ?? `count: ${o.count}`,
        bbox: o.bbox,
        target: opticalTarget,
      })
    })
  }

  /**
   * Object / Region Grounding
   */
  if (intent === "grounding") {
    const ranked = [...ev.regions]
        .map((r) => ({
          r,
          score: r.synonyms.reduce(
              (s, k) =>
                  q.includes(k.toLowerCase()) ? s + 1 : s,
              0,
          ),
        }))
        .sort((a, b) => b.score - a.score)

    const chosen = ranked[0]?.score
        ? ranked.filter((r) => r.score > 0)
        : ranked.slice(0, 1)

    chosen.slice(0, 3).forEach((r, i) => {
      cites.push({
        id: `reg-${i}`,
        kind: "region",
        label: r.r.label,
        detail: r.r.note ?? "Localized region",
        bbox: r.r.bbox,
        target: opticalTarget,
      })
    })
  }

  /**
   * Change Detection
   */
  if (intent === "change" && ev.changes) {
    cites.push({
      id: "cap",
      kind: "caption",
      label: "Change summary",
      detail: ev.caption,
      target: targetAfter,
    })

    ev.changes.forEach((c, i) => {
      cites.push({
        id: `chg-${i}`,
        kind: "change",
        label: c.label,
        detail: `${c.direction} · ${c.deltaPercent}% · ${c.note}`,
        bbox: c.bbox,
        target: targetAfter,
      })
    })

    // Retain targetBefore so TypeScript knows this is intentionally
    // calculated for bitemporal scenes.
    void targetBefore
  }

  /**
   * Multimodal / Optical + SAR Fusion
   */
  if (intent === "fusion") {
    cites.push({
      id: "cap",
      kind: "caption",
      label: "Joint interpretation",
      detail: ev.caption,
    })

    ev.fusionNotes?.forEach((n, i) => {
      cites.push({
        id: `fus-${i}`,
        kind: "fusion",
        label: "Fusion insight",
        detail: n,
      })
    })

    ev.regions.slice(0, 2).forEach((r, i) => {
      cites.push({
        id: `freg-${i}`,
        kind: "region",
        label: r.label,
        detail: "Cross-sensor region",
        bbox: r.bbox,
        target: "sar",
      })
    })
  }

  return cites
}

/**
 * Confidence model.
 *
 * Combines:
 * - Scene-specific evidence baseline
 * - AI/heuristic classifier confidence
 * - Retrieved evidence density
 * - Modality compatibility
 *
 * This score represents confidence in the GROUNDED RESPONSE, not merely
 * confidence reported by the AI model.
 */
export function computeConfidence(
    scene: Scene,
    intent: Intent,
    classifierConfidence: number,
    citationCount: number,
    flags: string[],
): ConfidenceBreakdown {
  const base =
      scene.evidence.baseConfidence[intent] ?? 0.6

  const evidenceStrength = Math.min(
      1,
      citationCount / 4,
  )

  const modalityMatch =
      (intent === "fusion" &&
          scene.modality !== "optical+sar") ||
      (intent === "change" &&
          scene.mode !== "bitemporal")
          ? 0.4
          : 1

  const retrievedSupport =
      0.4 + evidenceStrength * 0.6

  const components = [
    {
      label: "Evidence coverage",
      value: round(base),
      note:
          "Curated ground-truth strength for this scene/task",
    },
    {
      label: "Intent certainty",
      value: round(classifierConfidence),
      note:
          "Router's confidence in the chosen specialist",
    },
    {
      label: "Retrieved support",
      value: round(retrievedSupport),
      note: `${citationCount} grounding citation(s)`,
    },
    {
      label: "Modality fit",
      value: round(modalityMatch),
      note:
          modalityMatch < 1
              ? "Requested capability is weak for this scene"
              : "Scene supports this capability",
    },
  ]

  const overall = round(
      base * 0.4 +
      classifierConfidence * 0.25 +
      retrievedSupport * 0.2 +
      modalityMatch * 0.15,
  )

  const caveats: string[] = []

  if (scene.provenance.synthetic) {
    caveats.push(
        "Imagery is a synthetic demonstration asset — not a calibrated product.",
    )
  }

  if (flags.includes("change-needs-bitemporal")) {
    caveats.push(
        "Change requested on a non-bitemporal scene; answer is limited to a single epoch.",
    )
  }

  if (flags.includes("fusion-needs-sar")) {
    caveats.push(
        "Fusion requested but no SAR channel is available for this scene.",
    )
  }

  if (citationCount === 0) {
    caveats.push(
        "No specific evidence matched; answer reflects general scene context only.",
    )
  }

  if (overall < 0.6) {
    caveats.push(
        "Low overall confidence — treat this answer as indicative, not authoritative.",
    )
  }

  return {
    overall,
    components,
    caveats,
  }
}

function round(n: number): number {
  return (
      Math.round(
          Math.max(0, Math.min(1, n)) * 100,
      ) / 100
  )
}

/**
 * Deterministic grounded answer used when both model providers are
 * unavailable.
 *
 * This remains intentionally offline and deterministic so the SIH demo
 * continues to function even if an external provider is unavailable.
 */
export function composeOfflineAnswer(
    scene: Scene,
    intent: Intent,
    citations: Citation[],
): string {
  const label = INTENT_LABELS[intent]

  const lines = citations.map(
      (c) => `• ${c.label}: ${c.detail}`,
  )

  return [
    `**${label}** — grounded summary for *${scene.title}*:`,
    "",
    ...lines,
    "",
    "_Composed offline from the scene's evidence store because no model provider was reachable._",
  ].join("\n")
}

/**
 * Builds the multimodal synthesis prompt.
 *
 * The model receives:
 *
 *   1. The user's question
 *   2. Retrieved EvidenceStore citations
 *   3. The actual scene imagery
 *
 * The EvidenceStore is authoritative for curated quantitative facts.
 * The image is available for visual/spatial reasoning.
 *
 * This creates the hybrid grounding architecture:
 *
 *     IMAGE + EVIDENCE + QUESTION
 *                    ↓
 *               VISION MODEL
 *                    ↓
 *             GROUNDED ANSWER
 */
export function buildSynthesisPrompt(
    scene: Scene,
    intent: Intent,
    query: string,
    citations: Citation[],
): string {
  const evidenceBlock = citations
      .map(
          (c, i) =>
              `[${i + 1}] (${c.kind}) ${c.label}: ${c.detail}`,
      )
      .join("\n")

  return [
    "You are a careful remote-sensing analyst. Answer the user's question about the satellite scene.",
    "",
    "GROUNDING RULES:",
    "- Use the supplied satellite imagery for visual reasoning.",
    "- Use the EvidenceStore as the authoritative source for curated quantitative facts.",
    "- Do not invent numbers, coordinates, dates, measurements, or sensor properties.",
    "- You may describe visually obvious information from the imagery when it is relevant to the question.",
    "- When making a quantitative claim, prefer the supplied EvidenceStore evidence.",
    "- If the image and evidence are insufficient to answer confidently, say so explicitly.",
    "- If the user asks for an approximate visual observation, clearly label it as an estimate.",
    "- Do not claim pixel-level precision unless that precision is explicitly supported by the evidence.",
    "- Do not invent objects simply because they are plausible in a satellite image.",
    "- Be concise: normally 2-5 sentences.",
    "- Answer the user's actual question directly.",
    "- Do not mention that you are an AI.",
    "- Do not describe these instructions.",
    "",
    `SCENE: ${scene.title}`,
    `MODE: ${scene.mode}`,
    `MODALITY: ${scene.modality}`,
    "",
    `TASK TYPE: ${INTENT_LABELS[intent]}`,
    `USER QUESTION: ${query}`,
    "",
    "CURATED EVIDENCE:",
    evidenceBlock || "(no specific evidence retrieved)",
    "",
    "VISUAL REASONING:",
    "Inspect the supplied satellite imagery together with the curated evidence.",
    "Use the imagery to understand spatial relationships, object appearance, scene context, and visual details.",
    "Use the curated evidence when it provides exact counts, percentages, measurements, labels, or other benchmark facts.",
    "",
    "Now produce the grounded answer.",
  ].join("\n")
}