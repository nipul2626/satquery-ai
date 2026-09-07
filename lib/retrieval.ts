import type {
    Citation,
    ConfidenceBreakdown,
    Intent,
    QueryPlan,
    Scene,
} from "./types"
import { INTENT_LABELS } from "./registry"
import { parseQueryPlan } from "./ai"

function normalizeQuery(
    query: string,
): string {
    return query
        .toLowerCase()
        .replace(/[?.,!]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

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

    return (
        query.includes(normalizedWord) ||
        (
            normalizedWord.endsWith("s") &&
            normalizedWord.length > 3 &&
            query.includes(
                normalizedWord.slice(0, -1),
            )
        ) ||
        (
            !normalizedWord.endsWith("s") &&
            query.includes(`${normalizedWord}s`)
        )
    )
}

function scoreText(
    text: string,
    query: string,
): number {
    return text
        .toLowerCase()
        .split(/\s+/)
        .map((word) =>
            word.replace(/[^a-z0-9]/g, ""),
        )
        .filter((word) => word.length >= 3)
        .reduce(
            (score, word) =>
                score +
                (
                    wordMatchesQuery(
                        word,
                        query,
                    )
                        ? 1
                        : 0
                ),
            0,
        )
}

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
            score += 3
        } else if (
            normalizedKeyword.includes(query) &&
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
        score += 6
    }

    for (const synonym of region.synonyms) {
        if (
            query.includes(
                synonym.toLowerCase(),
            )
        ) {
            score += 3
        }
    }

    score += scoreText(
        region.label,
        query,
    )

    return score
}

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
        score += 6
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

export function retrieveCitations(
    scene: Scene,
    intent: Intent,
    query: string,
    suppliedPlan?: QueryPlan,
): Citation[] {
    const q = normalizeQuery(query)
    const plan =
        suppliedPlan ??
        parseQueryPlan(query, scene)

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

    if (intent === "caption") {
        cites.push({
            id: "evidence-caption",
            kind: "caption",
            label: "Scene context",
            detail: ev.caption,
            target:
                targetAfter ??
                opticalTarget,
            source: "evidence",
            role: "support",
        })

        ev.landCover
            .slice(0, 3)
            .forEach((landCover, index) => {
                cites.push({
                    id: `evidence-landcover-${index}`,
                    kind: "landcover",
                    label: landCover.class,
                    detail: `${landCover.percent}% of scene`,
                    target:
                        targetAfter ??
                        opticalTarget,
                    source: "evidence",
                    role: "support",
                })
            })
    }

    if (
        intent === "vqa" ||
        intent === "grounding"
    ) {
        const rankedFacts = [...ev.facts]
            .map((fact) => ({
                fact,
                score: scoreFact(
                    fact,
                    q,
                ),
            }))
            .filter((item) => item.score > 0)
            .sort(
                (a, b) =>
                    b.score - a.score,
            )

        const factLimit =
            plan.requiresMeasurement ||
            plan.operation === "count"
                ? 3
                : 2

        rankedFacts
            .slice(0, factLimit)
            .forEach((item, index) => {
                cites.push({
                    id: `evidence-fact-${index}`,
                    kind: "caption",
                    label: "EvidenceStore fact",
                    detail: item.fact.a,
                    target:
                        targetAfter ??
                        opticalTarget,
                    source: "evidence",
                    role: "support",
                })
            })

        const rankedObjects = ev.objects
            .map((object) => ({
                object,
                score: scoreObject(
                    object,
                    q,
                ),
            }))
            .filter((item) => item.score > 0)
            .sort(
                (a, b) =>
                    b.score - a.score,
            )

        const rankedRegions = ev.regions
            .map((region) => ({
                region,
                score: scoreRegion(
                    region,
                    q,
                ),
            }))
            .filter((item) => item.score > 0)
            .sort(
                (a, b) =>
                    b.score - a.score,
            )

        if (intent === "grounding") {
            rankedRegions
                .slice(0, 3)
                .forEach((item, index) => {
                    const region = item.region

                    cites.push({
                        id: `evidence-region-${index}`,
                        kind: "region",
                        label: region.label,
                        detail:
                            region.note ??
                            "Curated spatial support",
                        bbox: region.bbox,
                        overlay: region.overlay,
                        target:
                        opticalTarget,
                        source: "evidence",
                        role: "support",
                    })
                })

            rankedObjects
                .slice(0, 2)
                .forEach((item, index) => {
                    const object = item.object

                    const duplicate =
                        cites.some(
                            (citation) =>
                                citation.label
                                    .toLowerCase() ===
                                object.label.toLowerCase(),
                        )

                    if (duplicate) return

                    cites.push({
                        id: `evidence-object-${index}`,
                        kind: "object",
                        label: object.label,
                        detail:
                            object.note ??
                            `count: ${object.count}`,
                        bbox: object.bbox,
                        overlay: object.overlay,
                        target:
                        opticalTarget,
                        source: "evidence",
                        role: "support",
                    })
                })
        } else {
            rankedObjects
                .slice(0, 2)
                .forEach((item, index) => {
                    const object = item.object

                    cites.push({
                        id: `evidence-object-${index}`,
                        kind: "object",
                        label: object.label,
                        detail:
                            object.note ??
                            `count: ${object.count}`,
                        bbox: object.bbox,
                        overlay: object.overlay,
                        target:
                        opticalTarget,
                        source: "evidence",
                        role: "support",
                    })
                })
        }
    }

    if (
        intent === "change" &&
        ev.changes
    ) {
        cites.push({
            id: "evidence-change-context",
            kind: "caption",
            label: "Change context",
            detail: ev.caption,
            target: targetAfter,
            source: "evidence",
            role: "support",
        })

        ev.changes.forEach(
            (change, index) => {
                cites.push({
                    id: `evidence-change-${index}`,
                    kind: "change",
                    label: change.label,
                    detail:
                        `${change.direction} · ${change.deltaPercent}% · ${change.note}`,
                    bbox: change.bbox,
                    overlay: change.overlay,
                    target: targetAfter,
                    source: "evidence",
                    role: "support",
                })
            },
        )
    }

    if (intent === "fusion") {
        cites.push({
            id: "evidence-fusion-context",
            kind: "caption",
            label: "Joint sensor context",
            detail: ev.caption,
            target: "both",
            source: "evidence",
            role: "support",
        })

        ev.fusionNotes?.forEach(
            (note, index) => {
                cites.push({
                    id: `evidence-fusion-${index}`,
                    kind: "fusion",
                    label: "Fusion insight",
                    detail: note,
                    target: "both",
                    source: "evidence",
                    role: "support",
                })
            },
        )

        const rankedRegions = ev.regions
            .map((region) => ({
                region,
                score: scoreRegion(
                    region,
                    q,
                ),
            }))
            .filter((item) => item.score > 0)
            .sort(
                (a, b) =>
                    b.score - a.score,
            )

        rankedRegions
            .slice(0, 3)
            .forEach((item, index) => {
                cites.push({
                    id: `evidence-fusion-region-${index}`,
                    kind: "region",
                    label: item.region.label,
                    detail:
                        "Curated cross-sensor spatial support",
                    bbox: item.region.bbox,
                    overlay: item.region.overlay,
                    target: "both",
                    source: "evidence",
                    role: "support",
                })
            })
    }

    return dedupeCitations(cites)
}

export function formatCitationsForModel(
    citations: Citation[],
): string {
    if (!citations.length) {
        return "(no directly matching curated evidence)"
    }

    return citations
        .map(
            (citation, index) =>
                `[${index + 1}] ${citation.kind.toUpperCase()} · ${citation.label}: ${citation.detail}`,
        )
        .join("\n")
}

function dedupeCitations(
    citations: Citation[],
): Citation[] {
    const seen = new Set<string>()

    return citations.filter(
        (citation) => {
            const key = [
                citation.kind,
                citation.label,
                citation.detail,
            ]
                .join("|")
                .toLowerCase()

            if (seen.has(key)) {
                return false
            }

            seen.add(key)
            return true
        },
    )
}

export function computeConfidence(
    scene: Scene,
    intent: Intent,
    classifierConfidence: number,
    citationCount: number,
    flags: string[],
): ConfidenceBreakdown {
    const base =
        scene.evidence.baseConfidence[
            intent
            ] ?? 0.6

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
        0.35 +
        evidenceStrength * 0.65

    const components = [
        {
            label: "Evidence coverage",
            value: round(base),
            note:
                "Curated scene evidence available as supporting context",
        },
        {
            label: "Intent certainty",
            value: round(
                classifierConfidence,
            ),
            note:
                "Deterministic query-operation routing confidence",
        },
        {
            label: "Retrieved support",
            value: round(
                retrievedSupport,
            ),
            note:
                `${citationCount} supporting citation(s)`,
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
        base * 0.35 +
        classifierConfidence * 0.25 +
        retrievedSupport * 0.25 +
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
            "No curated evidence matched this query; visual reasoning must carry the answer.",
        )
    }

    if (overall < 0.6) {
        caveats.push(
            "Low prior confidence — treat the visual answer as indicative rather than authoritative.",
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
                Math.min(1, value),
            ) * 100,
        ) / 100
    )
}

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
        `**${label}** — grounded fallback for *${scene.title}*:`,
        "",
        ...(lines.length
            ? lines
            : [
                "• No curated evidence matched the question. External vision providers were unavailable.",
            ]),
        "",
        "_This fallback uses only the local scene evidence store; it does not claim new visual discoveries._",
    ].join("\n")
}

/**
 * Kept as a compatibility helper for any code that still imports it.
 * The actual visual-analysis prompt is built in lib/vision.ts.
 */
export function buildSynthesisPrompt(
    scene: Scene,
    intent: Intent,
    query: string,
    citations: Citation[],
): string {
    return [
        "SatQuery AI visual-analysis context.",
        `Scene: ${scene.title}`,
        `Task: ${INTENT_LABELS[intent]}`,
        `User question: ${query}`,
        "",
        "Curated evidence is supporting context, not a substitute for image inspection.",
        "The attached imagery is the primary source for visual object discovery and grounding.",
        "",
        "Supporting evidence:",
        formatCitationsForModel(citations),
    ].join("\n")
}
