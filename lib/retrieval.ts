import type {
  Citation,
  ConfidenceBreakdown,
  Intent,
  Scene,
} from "./types"

import { INTENT_LABELS } from "./registry"

/**
 * Normalize a user query for deterministic matching.
 */
function normalizeQuery(
    query: string,
): string {
  return query
      .toLowerCase()
      .replace(/[?.,!]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
}

/**
 * Basic singular/plural-aware token match.
 */
function wordMatchesQuery(
    word: string,
    query: string,
): boolean {
  const normalizedWord = word
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")

  if (normalizedWord.length < 3) {
    return false
  }

  if (query.includes(normalizedWord)) {
    return true
  }

  if (
      normalizedWord.endsWith("s") &&
      normalizedWord.length > 3 &&
      query.includes(
          normalizedWord.slice(0, -1),
      )
  ) {
    return true
  }

  if (
      !normalizedWord.endsWith("s") &&
      query.includes(`${normalizedWord}s`)
  ) {
    return true
  }

  return false
}

/**
 * Score a text string against the normalized query.
 */
function scoreText(
    text: string,
    query: string,
): number {
  const words = text
      .toLowerCase()
      .split(/\s+/)
      .map((word) =>
          word.replace(/[^a-z0-9]/g, ""),
      )
      .filter(
          (word) => word.length >= 3,
      )

  let score = 0

  for (const word of words) {
    if (
        wordMatchesQuery(
            word,
            query,
        )
    ) {
      score += 1
    }
  }

  return score
}

/**
 * Score an EvidenceStore fact against a query.
 *
 * Keywords are more important than the natural-language
 * question field because they are deliberately authored
 * for retrieval.
 */
function scoreFact(
    fact: {
      q: string
      a: string
      keywords: string[]
    },
    query: string,
): number {
  let score = 0

  for (const keyword of fact.keywords) {
    const normalizedKeyword =
        keyword.toLowerCase()

    if (
        query.includes(
            normalizedKeyword,
        )
    ) {
      score += 2
    } else if (
        normalizedKeyword.includes(
            query,
        ) &&
        query.length >= 4
    ) {
      score += 1
    }
  }

  score += scoreText(
      fact.q,
      query,
  )

  return score
}

/**
 * Score a scene region against the query.
 */
function scoreRegion(
    region: {
      label: string
      synonyms: string[]
    },
    query: string,
): number {
  let score = 0

  if (
      query.includes(
          region.label.toLowerCase(),
      )
  ) {
    score += 4
  }

  for (const synonym of region.synonyms) {
    const normalized =
        synonym.toLowerCase()

    if (
        query.includes(normalized)
    ) {
      score += 2
    }
  }

  score += scoreText(
      region.label,
      query,
  )

  return score
}

/**
 * Score an object against the query.
 */
function scoreObject(
    object: {
      label: string
      note?: string
    },
    query: string,
): number {
  let score = 0

  if (
      query.includes(
          object.label.toLowerCase(),
      )
  ) {
    score += 4
  }

  score += scoreText(
      object.label,
      query,
  )

  if (object.note) {
    score += scoreText(
        object.note,
        query,
    )
  }

  return score
}

/**
 * Evidence retrieval.
 *
 * The EvidenceStore remains authoritative for curated
 * quantitative facts.
 *
 * The actual satellite imagery is supplied separately to
 * the synthesis model for visual reasoning.
 */
export function retrieveCitations(
    scene: Scene,
    intent: Intent,
    query: string,
): Citation[] {
  const q = normalizeQuery(query)

  const ev = scene.evidence

  const cites: Citation[] = []

  const targetBefore =
      scene.mode === "bitemporal"
          ? ("before" as const)
          : undefined

  const targetAfter =
      scene.mode === "bitemporal"
          ? ("after" as const)
          : undefined

  const opticalTarget =
      scene.mode === "pair"
          ? ("optical" as const)
          : undefined

  // ---------------------------------------------------------------------------
  // CAPTION
  // ---------------------------------------------------------------------------

  if (intent === "caption") {
    cites.push({
      id: "cap",
      kind: "caption",
      label: "Scene caption",
      detail: ev.caption,
      target:
          targetAfter ??
          opticalTarget,
    })

    ev.landCover
        .slice(0, 3)
        .forEach((landCover, index) => {
          cites.push({
            id: `lc-${index}`,
            kind: "landcover",
            label: landCover.class,
            detail: `${landCover.percent}% of scene`,
            target:
                targetAfter ??
                opticalTarget,
          })
        })
  }

  // ---------------------------------------------------------------------------
  // VQA
  // ---------------------------------------------------------------------------

  if (intent === "vqa") {
    const rankedFacts =
        [...ev.facts]
            .map((fact) => ({
              fact,
              score: scoreFact(
                  fact,
                  q,
              ),
            }))
            .sort(
                (a, b) =>
                    b.score - a.score,
            )

    const chosenFacts =
        rankedFacts[0]?.score
            ? rankedFacts
                .filter(
                    (item) =>
                        item.score > 0,
                )
                .slice(0, 2)
            : rankedFacts.slice(0, 1)

    chosenFacts.forEach(
        (item, index) => {
          cites.push({
            id: `fact-${index}`,
            kind: "caption",
            label: "Fact",
            detail: item.fact.a,
            target: opticalTarget,
          })
        },
    )

    /**
     * IMPORTANT:
     *
     * Only objects that actually match the question
     * are retrieved.
     *
     * The old implementation could attach every object
     * whenever ANY fact matched.
     */
    const matchedObjects =
        ev.objects
            .map((object) => ({
              object,
              score: scoreObject(
                  object,
                  q,
              ),
            }))
            .filter(
                (item) =>
                    item.score > 0,
            )
            .sort(
                (a, b) =>
                    b.score - a.score,
            )

    matchedObjects
        .slice(0, 2)
        .forEach(
            (item, index) => {
              const object =
                  item.object

              cites.push({
                id: `obj-${index}`,
                kind: "object",
                label: object.label,
                detail:
                    object.note ??
                    `count: ${object.count}`,

                bbox: object.bbox,

                /**
                 * CRITICAL FIX:
                 *
                 * Preserve custom line/polygon geometry.
                 */
                overlay:
                object.overlay,

                target:
                opticalTarget,
              })
            },
        )
  }

  // ---------------------------------------------------------------------------
  // GROUNDING
  // ---------------------------------------------------------------------------

  if (intent === "grounding") {
    /**
     * First retrieve regions.
     *
     * Regions are ranked by direct relevance so that if
     * the user asks:
     *
     *   "Show me the bridge..."
     *
     * the Road bridge citation is placed before a generic
     * Harbor water body citation.
     */
    const rankedRegions =
        ev.regions
            .map((region) => ({
              region,
              score: scoreRegion(
                  region,
                  q,
              ),
            }))
            .sort(
                (a, b) =>
                    b.score - a.score,
            )

    const matchedRegions =
        rankedRegions
            .filter(
                (item) =>
                    item.score > 0,
            )
            .slice(0, 3)

    /**
     * If no region matches, retain the previous safe
     * behavior of returning the most relevant authored
     * region.
     */
    const chosenRegions =
        matchedRegions.length > 0
            ? matchedRegions
            : rankedRegions.slice(
                0,
                1,
            )

    chosenRegions.forEach(
        (item, index) => {
          const region =
              item.region

          cites.push({
            id: `reg-${index}`,
            kind: "region",
            label: region.label,
            detail:
                region.note ??
                "Localized region",

            bbox: region.bbox,

            /**
             * CRITICAL FIX:
             *
             * Preserve custom geometry.
             *
             * The Road bridge has a line overlay.
             */
            overlay:
            region.overlay,

            target:
            opticalTarget,
          })
        },
    )

    /**
     * Retrieve relevant quantitative facts too.
     *
     * This is important for questions such as:
     *
     * "Show me the bridge and estimate its length."
     *
     * The model needs the authored measurement evidence
     * rather than inventing a number.
     */
    const rankedFacts =
        [...ev.facts]
            .map((fact) => ({
              fact,
              score: scoreFact(
                  fact,
                  q,
              ),
            }))
            .sort(
                (a, b) =>
                    b.score - a.score,
            )

    const matchedFacts =
        rankedFacts
            .filter(
                (item) =>
                    item.score > 0,
            )
            .slice(0, 2)

    matchedFacts.forEach(
        (item, index) => {
          cites.push({
            id: `fact-${index}`,
            kind: "caption",
            label: "Fact",
            detail: item.fact.a,
            target: opticalTarget,
          })
        },
    )

    /**
     * Also inspect explicitly detected objects.
     *
     * This helps grounding queries find an object when
     * the region terminology is not an exact match.
     */
    const matchedObjects =
        ev.objects
            .map((object) => ({
              object,
              score: scoreObject(
                  object,
                  q,
              ),
            }))
            .filter(
                (item) =>
                    item.score > 0,
            )
            .sort(
                (a, b) =>
                    b.score - a.score,
            )

    /**
     * Only add an object if the corresponding region
     * was not already retrieved.
     */
    const existingLabels =
        new Set(
            chosenRegions.map(
                (item) =>
                    item.region.label.toLowerCase(),
            ),
        )

    matchedObjects
        .filter(
            (item) =>
                !existingLabels.has(
                    item.object.label.toLowerCase(),
                ),
        )
        .slice(0, 2)
        .forEach(
            (item, index) => {
              const object =
                  item.object

              cites.push({
                id: `obj-${index}`,
                kind: "object",
                label: object.label,
                detail:
                    object.note ??
                    `count: ${object.count}`,

                bbox: object.bbox,

                overlay:
                object.overlay,

                target:
                opticalTarget,
              })
            },
        )
  }

  // ---------------------------------------------------------------------------
  // CHANGE DETECTION
  // ---------------------------------------------------------------------------

  if (
      intent === "change" &&
      ev.changes
  ) {
    cites.push({
      id: "cap",
      kind: "caption",
      label: "Change summary",
      detail: ev.caption,
      target: targetAfter,
    })

    ev.changes.forEach(
        (change, index) => {
          cites.push({
            id: `chg-${index}`,
            kind: "change",
            label: change.label,
            detail:
                `${change.direction} · ${change.deltaPercent}% · ${change.note}`,

            bbox: change.bbox,

            overlay:
            change.overlay,

            target:
            targetAfter,
          })
        },
    )

    void targetBefore
  }

  // ---------------------------------------------------------------------------
  // FUSION
  // ---------------------------------------------------------------------------

  if (intent === "fusion") {
    cites.push({
      id: "cap",
      kind: "caption",
      label: "Joint interpretation",
      detail: ev.caption,
    })

    ev.fusionNotes?.forEach(
        (note, index) => {
          cites.push({
            id: `fus-${index}`,
            kind: "fusion",
            label: "Fusion insight",
            detail: note,
          })
        },
    )

    ev.regions
        .slice(0, 2)
        .forEach(
            (region, index) => {
              cites.push({
                id: `freg-${index}`,
                kind: "region",
                label: region.label,
                detail:
                    "Cross-sensor region",

                bbox: region.bbox,

                overlay:
                region.overlay,

                target: "sar",
              })
            },
        )
  }

  return cites
}

// -----------------------------------------------------------------------------
// CONFIDENCE
// -----------------------------------------------------------------------------

/**
 * Confidence model.
 *
 * Combines:
 * - scene-specific evidence baseline
 * - classifier confidence
 * - retrieved evidence density
 * - modality compatibility
 */
export function computeConfidence(
    scene: Scene,
    intent: Intent,
    classifierConfidence: number,
    citationCount: number,
    flags: string[],
): ConfidenceBreakdown {
  const base =
      scene.evidence
          .baseConfidence[intent] ??
      0.6

  const evidenceStrength =
      Math.min(
          1,
          citationCount / 4,
      )

  const modalityMatch =
      (
          intent === "fusion" &&
          scene.modality !==
          "optical+sar"
      ) ||
      (
          intent === "change" &&
          scene.mode !==
          "bitemporal"
      )
          ? 0.4
          : 1

  const retrievedSupport =
      0.4 +
      evidenceStrength * 0.6

  const components = [
    {
      label: "Evidence coverage",
      value: round(base),
      note:
          "Curated ground-truth strength for this scene/task",
    },

    {
      label: "Intent certainty",
      value: round(
          classifierConfidence,
      ),
      note:
          "Router's confidence in the chosen specialist",
    },

    {
      label: "Retrieved support",
      value: round(
          retrievedSupport,
      ),
      note:
          `${citationCount} grounding citation(s)`,
    },

    {
      label: "Modality fit",
      value: round(
          modalityMatch,
      ),
      note:
          modalityMatch < 1
              ? "Requested capability is weak for this scene"
              : "Scene supports this capability",
    },
  ]

  const overall = round(
      base * 0.4 +
      classifierConfidence *
      0.25 +
      retrievedSupport * 0.2 +
      modalityMatch * 0.15,
  )

  const caveats: string[] = []

  if (
      scene.provenance.synthetic
  ) {
    caveats.push(
        "Imagery is a synthetic demonstration asset — not a calibrated product.",
    )
  }

  if (
      flags.includes(
          "change-needs-bitemporal",
      )
  ) {
    caveats.push(
        "Change requested on a non-bitemporal scene; answer is limited to a single epoch.",
    )
  }

  if (
      flags.includes(
          "fusion-needs-sar",
      )
  ) {
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

function round(
    value: number,
): number {
  return (
      Math.round(
          Math.max(
              0,
              Math.min(
                  1,
                  value,
              ),
          ) * 100,
      ) / 100
  )
}

// -----------------------------------------------------------------------------
// OFFLINE FALLBACK
// -----------------------------------------------------------------------------

/**
 * Deterministic grounded answer used only when both
 * external model providers are unavailable.
 */
export function composeOfflineAnswer(
    scene: Scene,
    intent: Intent,
    citations: Citation[],
): string {
  const label =
      INTENT_LABELS[intent]

  const lines =
      citations.map(
          (citation) =>
              `• ${citation.label}: ${citation.detail}`,
      )

  return [
    `**${label}** — grounded summary for *${scene.title}*:`,
    "",
    ...lines,
    "",
    "_Composed offline from the scene's evidence store because no model provider was reachable._",
  ].join("\n")
}

// -----------------------------------------------------------------------------
// SYNTHESIS PROMPT
// -----------------------------------------------------------------------------

/**
 * Builds the multimodal synthesis prompt.
 *
 * The model receives:
 *
 *   1. User question
 *   2. Retrieved EvidenceStore citations
 *   3. Actual satellite imagery
 *
 * Architecture:
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
  const evidenceBlock =
      citations
          .map(
              (citation, index) =>
                  `[${index + 1}] (${citation.kind}) ${citation.label}: ${citation.detail}`,
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

    evidenceBlock ||
    "(no specific evidence retrieved)",

    "",

    "VISUAL REASONING:",

    "Inspect the supplied satellite imagery together with the curated evidence.",

    "Use the imagery to understand spatial relationships, object appearance, scene context, and visual details.",

    "Use the curated evidence when it provides exact counts, percentages, measurements, labels, or other benchmark facts.",

    "",

    "IMPORTANT FOR MEASUREMENT QUESTIONS:",

    "If a curated approximate measurement is supplied, use that value rather than inventing another measurement.",

    "If the measurement is explicitly approximate or simulated, preserve that qualification in the answer.",

    "Do not present a simulated demonstration measurement as a real calibrated geospatial measurement.",

    "",

    "Now produce the grounded answer.",
  ].join("\n")
}