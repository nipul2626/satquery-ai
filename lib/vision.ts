import { z } from "zod"
import { readFile } from "fs/promises"
import path from "path"
import type {
    BBox,
    Citation,
    OverlayGeometry,
    Scene,
    VisualAnalysisResult,
    VisualFinding,
    RankedCandidate,
    MeasurementResult,
} from "./types"

export type ImageFilePart = {
    type: "file"
    data: Buffer
    mediaType: string
}

async function readSceneImage(
    filePath: string,
): Promise<ImageFilePart> {
    const absolutePath = path.join(
        process.cwd(),
        "public",
        filePath.replace(/^\/+/, ""),
    )

    const buffer = await readFile(absolutePath)

    const extension = path
        .extname(absolutePath)
        .toLowerCase()

    let mediaType = "image/png"

    if (
        extension === ".jpg" ||
        extension === ".jpeg"
    ) {
        mediaType = "image/jpeg"
    } else if (extension === ".webp") {
        mediaType = "image/webp"
    } else if (extension === ".gif") {
        mediaType = "image/gif"
    }

    return {
        type: "file",
        data: buffer,
        mediaType,
    }
}

export async function getSceneImageParts(
    scene: Scene,
): Promise<ImageFilePart[]> {
    const imagePaths: string[] = []

    if (scene.mode === "single") {
        if (scene.images.optical) {
            imagePaths.push(scene.images.optical)
        }
    }

    if (scene.mode === "pair") {
        if (scene.images.optical) {
            imagePaths.push(scene.images.optical)
        }

        if (scene.images.sar) {
            imagePaths.push(scene.images.sar)
        }
    }

    if (scene.mode === "bitemporal") {
        if (scene.images.before) {
            imagePaths.push(scene.images.before)
        }

        if (scene.images.after) {
            imagePaths.push(scene.images.after)
        }
    }

    const parts: ImageFilePart[] = []

    for (const imagePath of imagePaths) {
        try {
            const part = await readSceneImage(imagePath)

            parts.push(part)

            console.log(
                `[satquery] loaded scene image: ${imagePath}`,
            )
        } catch (error) {
            console.error(
                `[satquery] unable to load scene image ${imagePath}:`,
                error instanceof Error
                    ? error.message
                    : error,
            )
        }
    }

    return parts
}

// -----------------------------------------------------------------------------
// LOCAL VALIDATION SCHEMA
//
// This schema is intentionally used AFTER the provider returns JSON.
// We do not ask Qwen 3.6 to satisfy this schema through constrained decoding.
// -----------------------------------------------------------------------------

const pointSchema = z.object({
    x: z.number(),
    y: z.number(),
})

const bboxSchema = z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
})

const findingSchema = z.object({
    id: z.string(),
    label: z.string(),
    description: z.string(),
    geometryType: z.enum([
        "point",
        "bbox",
        "line",
        "polygon",
    ]),
    bbox: bboxSchema.nullable(),
    points: z.array(pointSchema).max(32),
    target: z.enum([
        "optical",
        "sar",
        "before",
        "after",
        "both",
    ]),
    confidence: z.number().min(0).max(1),
    selected: z.boolean(),
})

const candidateSchema = z.object({
    id: z.string(),
    rank: z.number().int().min(1).optional(),
    label: z.string(),
    bbox: bboxSchema.nullable(),
    points: z.array(pointSchema).max(32),
    geometryType: z.enum([
        "point",
        "bbox",
        "line",
        "polygon",
    ]),
    target: z.enum([
        "optical",
        "sar",
        "before",
        "after",
        "both",
    ]),
    confidence: z.number().min(0).max(1),
})

const measurementSchema = z.object({
    requested: z.enum([
        "length",
        "diameter",
        "width",
        "height",
        "depth",
        "distance",
        "area",
        "count",
        "none",
    ]),
    value: z.number().nullable(),
    unit: z.string().nullable(),
    status: z.enum([
        "evidence",
        "visual-estimate",
        "unsupported",
    ]),
    confidence: z.number().min(0).max(1),
    caveat: z.string().nullable(),
})

export const VisualAnalysisSchema = z.object({
    answer: z.string(),
    findings: z.array(findingSchema).max(20),
    rankedCandidates: z.array(candidateSchema).max(20),
    selectedFindingId: z.string().nullable(),
    measurement: measurementSchema,
    observations: z.array(z.string()).max(12),
    confidence: z.number().min(0).max(1),
})

export type VisualAnalysisModelOutput =
    z.infer<typeof VisualAnalysisSchema>

// -----------------------------------------------------------------------------
// MODEL INSTRUCTIONS
// -----------------------------------------------------------------------------

export function buildVisualAnalysisInstructions(
    scene: Scene,
    query: string,
    plan: {
        operation: string
        targetHint: string | null
        regionHint: string | null
        spatialRelation: string | null
        ordinal: number | null
        ranking: string | null
        measurement: string
        requestedModality: string
        requiresGrounding: boolean
        requiresComparison: boolean
        requiresMeasurement: boolean
        requiresCandidateSearch: boolean
    },
    evidenceText: string,
): string {
    const imageOrder =
        scene.mode === "pair"
            ? "Image 1 = optical imagery. Image 2 = SAR imagery."
            : scene.mode === "bitemporal"
                ? "Image 1 = before imagery. Image 2 = after imagery."
                : "Image 1 = the primary optical image."

    const rankingTask =
        plan.requiresCandidateSearch ||
        plan.requiresComparison ||
        plan.ranking !== null ||
        plan.ordinal !== null

    const groundingTask = plan.requiresGrounding
    const measurementTask = plan.requiresMeasurement
    const changeTask = plan.operation === "change" || scene.mode === "bitemporal"
    const fusionTask =
        plan.requestedModality === "both" ||
        plan.operation === "fusion" ||
        scene.mode === "pair"

    return [
        "You are SatQuery AI's multimodal remote-sensing vision engine.",
        "Your job is to inspect the attached image(s) directly and answer the user's request from visual evidence.",
        "Treat the pixels as the primary source for visual facts, object discovery, localization, comparison, ranking, and change detection.",
        "EvidenceStore is auxiliary support, not a substitute for inspecting the imagery.",
        "",
        "OUTPUT CONTRACT:",
        "Return exactly ONE complete JSON object and nothing else.",
        "Do not use markdown fences.",
        "Do not output chain-of-thought or hidden reasoning.",
        "Use concise evidence summaries instead of internal reasoning.",
        "Every required top-level field must be present even when its value is null, empty, or unsupported.",
        "",
        "USER REQUEST:",
        query,
        "",
        "QUERY PLAN (routing only; verify it against the imagery):",
        JSON.stringify(plan),
        "",
        `SCENE: ${scene.title}`,
        `BODY: ${scene.body}`,
        `MODE: ${scene.mode}`,
        `MODALITY: ${scene.modality}`,
        `SENSOR: ${scene.sensor}`,
        `GSD: ${scene.gsd}`,
        `IMAGE ORDER: ${imageOrder}`,
        "",
        "CORE VISUAL PRINCIPLES:",
        "1. Inspect the complete relevant image before deciding what the answer is.",
        "2. Do not assume that an object exists because EvidenceStore mentions it.",
        "3. Do not invent objects, locations, measurements, labels, or coordinates.",
        "4. Prefer what is visibly supported by the imagery; use evidence only to supplement or verify facts that genuinely correspond to the identified feature.",
        "5. If the image is ambiguous, say so and reduce confidence rather than forcing a precise answer.",
        "6. Do not mistake shadows, texture, highlights, SAR speckle, or image artifacts for separate objects without visual support.",
        "7. Distinguish visible appearance from physical interpretation. A single optical image does not automatically reveal true depth, height, or calibrated distance.",
        "",
        "COORDINATE SYSTEM:",
        "All geometry coordinates MUST be normalized to 0..1 relative to the supplied image.",
        "x=0 is the left edge; x=1 is the right edge.",
        "y=0 is the top edge; y=1 is the bottom edge.",
        "Never return pixel coordinates.",
        "",
        "OBJECT DISCOVERY:",
        "When identifying an object or feature, search the relevant image for the actual visual signature of that object.",
        "Use the whole scene context to distinguish the target from visually similar structures.",
        "For plural requests such as all ships, all visible craters, or multiple flooded areas, identify each confidently visible instance rather than returning one representative object.",
        "",
        "RANKING / COMPARISON WORKFLOW:",
        rankingTask
            ? [
                "THIS IS A COMPARISON OR RANKING TASK.",
                "Do NOT jump directly to the requested ordinal answer.",
                "First inspect the ENTIRE relevant image and enumerate the plausible candidates belonging to the requested object class.",
                "Do not rank an object until you have searched the complete visible scene for other candidates.",
                "For each candidate, determine its visual location and estimate the relevant comparison property consistently.",
                "For size-based rankings such as largest, second-largest, or smallest, compare the visible extent of the SAME object class using a consistent criterion.",
                "For crater rankings, compare the visible crater basin/rim extent, not ejecta rays, shadows, surrounding terrain, or image prominence.",
                "For ship or vehicle rankings, compare the visible body of the object, not its wake, shadow, reflection, or surrounding water.",
                "For building rankings, compare the visible building footprint/structure, not adjacent roads, parking areas, or shadows.",
                "For flooded-area rankings, compare the actual connected inundated region, not surrounding dark terrain or water-like shadows.",
                "For linear-feature rankings, compare the visible feature length rather than the size of its surrounding region.",
                "For ordinal requests such as second-largest, determine rank 1 first, then rank 2, then the remaining candidates.",
                "The rankedCandidates array MUST be ordered from rank 1 to the lowest rank.",
                "The first candidate in rankedCandidates represents rank 1; the second represents rank 2; and so on.",
                "Include at least 3 plausible candidates whenever at least 3 candidates are visibly distinguishable.",
                "Every ranked candidate should have geometry whenever it can be localized reliably.",
                "The selected candidate MUST correspond to the requested ordinal and ranking property.",
                "selectedFindingId MUST point to the selected candidate or to a finding with the same visual target.",
                "Do not select a candidate merely because it is centered, bright, dark, visually prominent, or mentioned by EvidenceStore.",
                "If two candidates are genuinely ambiguous in size, acknowledge the ambiguity and reduce confidence rather than pretending the ranking is certain.",
                "Never manufacture candidates simply to satisfy the minimum count.",
            ].join("\n")
            : "No ranking is requested. Do not fabricate ranked candidates; keep rankedCandidates empty unless comparison is genuinely necessary to answer the question.",
        "",
        "GROUNDING WORKFLOW:",
        groundingTask
            ? [
                "GROUNDING IS REQUIRED.",
                "Return geometry for the exact requested target(s).",
                "For a compact object such as a ship, vehicle, building, or crater, use a TIGHT bounding box around the visible object.",
                "For an elongated feature such as a bridge, road, river segment, runway, or shoreline, prefer a line or polygon that follows the visible feature.",
                "For an irregular region such as floodwater, a lake, shadowed terrain, or a settlement, use a polygon when its boundary can be traced reliably.",
                "Use a point only when a point is more faithful than an area or line.",
                "A bbox must enclose the target itself, not an arbitrary image quadrant or surrounding empty terrain.",
                "Do not make a bbox huge merely because the target is partially uncertain.",
                "If only part of a target is visible at the image edge, bound the visible portion and say that it is truncated.",
                "Never use a generic center-of-image point as a substitute for localization.",
                "If the target cannot be localized confidently, return no geometry rather than guessing.",
            ].join("\n")
            : "Grounding is not explicitly required. Add geometry only when it materially supports the answer.",
        "",
        "MEASUREMENT WORKFLOW:",
        measurementTask
            ? [
                "A measurement or count is requested.",
                "For counts, count distinct visually supported instances and avoid double-counting overlapping or partially hidden objects.",
                "For diameter/width/length/area, only estimate from image geometry when the image provides a defensible scale or the result can be clearly labeled a visual estimate.",
                "Never present a visual estimate as a calibrated geospatial measurement.",
                "Use EvidenceStore for an authored measurement only when the evidence clearly corresponds to the visually identified feature.",
                "Depth is normally unsupported from one 2-D optical image. Do not derive physical crater depth from darkness, rim shadow, or apparent relief alone.",
                "If a requested physical quantity cannot be defensibly obtained, set measurement.status='unsupported', value=null, and explain why in caveat.",
                "If an approximate quantity is visually inferred, set status='visual-estimate' and include the limitation in caveat.",
            ].join("\n")
            : "No physical measurement is required. Set measurement.requested='none'.",
        "",
        "TEMPORAL / CHANGE ANALYSIS:",
        changeTask
            ? [
                "For before/after imagery, compare corresponding locations and features rather than simply describing each image independently.",
                "Identify actual changes visible between the two dates: new, removed, expanded, contracted, shifted, inundated, exposed, or otherwise altered areas/features.",
                "Use before/after geometry on the correct image target when possible.",
                "Do not call normal illumination, shadow, seasonal appearance, or sensor differences a physical change unless supported by context.",
            ].join("\n")
            : "No temporal change analysis is required.",
        "",
        "OPTICAL / SAR / MULTIMODAL ANALYSIS:",
        fusionTask
            ? [
                "Respect the modality requested by the user.",
                "For optical, reason from visible color, texture, shape, shadow, tone, and spatial context.",
                "For SAR, reason from backscatter patterns, texture, structural response, and the supplied SAR representation; do not treat SAR brightness as ordinary optical brightness.",
                "When both sensors are available, inspect both images and explicitly use agreement or disagreement between modalities.",
                "Never claim that SAR proves a material or phenomenon when the supplied SAR rendering alone does not support that conclusion.",
            ].join("\n")
            : "Use the modality most appropriate to the user's request and the supplied scene.",
        "",
        "EVIDENCESTORE SUPPORT:",
        evidenceText || "(No directly matching curated evidence was retrieved.)",
        "",
        "IMPORTANT EVIDENCE RULE:",
        "An EvidenceStore fact may support a factual answer, but it must not override what the imagery visibly shows for object identity or location.",
        "If an evidence fact refers to a feature that you cannot confidently match to the image, do not use it to manufacture a visual grounding target.",
        "",
        "SELF-CHECK BEFORE JSON:",
        "1. Did I inspect the full relevant image(s)?",
        "2. Did I answer the exact user request rather than a nearby question?",
        rankingTask
            ? "3. For ranking/comparison, did I identify and compare multiple candidates before selecting the requested one?"
            : "3. If no ranking was requested, did I avoid unnecessary candidate fabrication?",
        groundingTask
            ? "4. Is the selected geometry tightly and correctly aligned to the requested feature?"
            : "4. Did I avoid unnecessary or misleading geometry?",
        measurementTask
            ? "5. Is every measurement either evidence-backed, a clearly labeled visual estimate, or explicitly unsupported?"
            : "5. Did I avoid inventing measurements?",
        "6. Did I keep optical, SAR, and temporal interpretations tied to the correct image?",
        "7. If uncertain, did I lower confidence and explain the limitation instead of hallucinating?",
        "",
        "RETURN EXACTLY THIS JSON SHAPE:",
        JSON.stringify(
            {
                answer: "Direct answer to the user's question in 1-4 concise sentences.",
                findings: [
                    {
                        id: "target-1",
                        label: "precise visual label",
                        description: "Short description of what is visibly present and why it answers the request.",
                        geometryType: "bbox",
                        bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
                        points: [],
                        target: "optical",
                        confidence: 0.9,
                        selected: true,
                    },
                ],
                rankedCandidates: [],
                selectedFindingId: "target-1",
                measurement: {
                    requested: "none",
                    value: null,
                    unit: null,
                    status: "unsupported",
                    confidence: 0,
                    caveat: null,
                },
                observations: [
                    "Brief visual observation supporting the answer.",
                ],
                confidence: 0.9,
            },
            null,
            2,
        ),
        "",
        "Replace every example value with information from the actual imagery.",
        "If there is no selected visual target, selectedFindingId must be null.",
        "If measurement is not applicable, requested='none', value=null, unit=null, status='unsupported'.",
        "Keep JSON compact enough to finish completely. Completeness is more important than verbose descriptions.",
    ].join("\n")
}

// -----------------------------------------------------------------------------
// CITATION / OVERLAY CONVERSION
// -----------------------------------------------------------------------------

export function visualAnalysisToCitations(
    analysis: VisualAnalysisResult,
): Citation[] {
    const citations: Citation[] = []
    const usedIds = new Set<string>()

    const selectedId = analysis.selectedFindingId

    const findings = [...analysis.findings].sort((a, b) => {
        const aSelected = a.id === selectedId || a.selected ? 0 : 1
        const bSelected = b.id === selectedId || b.selected ? 0 : 1

        return aSelected - bSelected || b.confidence - a.confidence
    })

    for (const finding of findings) {
        const geometry = normalizeGeometry(
            finding.geometryType,
            finding.points,
            finding.bbox,
        )

        const bbox =
            finding.bbox ??
            geometryToBBox(geometry) ??
            pointsToBBox(normalizePoints(finding.points))

        if (!bbox) continue

        const isSelected =
            finding.id === selectedId || finding.selected

        const baseId = `vision-${slugify(finding.id || finding.label)}`
        const id = uniqueId(baseId, usedIds)

        citations.push({
            id,
            kind: finding.geometryType === "polygon" ? "region" : "object",
            label: finding.label,
            detail: [
                isSelected ? "AI-selected visual target" : "AI visual finding",
                `${Math.round(finding.confidence * 100)}% visual confidence`,
                finding.description,
            ].join(" · "),
            bbox: clampBBox(bbox),
            overlay: geometry ?? undefined,
            target: finding.target === "both" ? "both" : finding.target,
            source: "vision",
            role: isSelected ? "target" : "candidate",
            confidence: clamp01(finding.confidence),
        })
    }

    // Defensive fallback: if the model ranked candidates but failed to duplicate
    // the selected candidate in findings, still expose the selected candidate's
    // grounding rather than silently losing it.
    if (
        selectedId &&
        !citations.some((citation) => citation.role === "target")
    ) {
        const selectedCandidate = analysis.rankedCandidates.find(
            (candidate) => candidate.id === selectedId,
        )

        if (selectedCandidate) {
            const bbox = selectedCandidate.bbox
                ? normalizeBBox(selectedCandidate.bbox)
                : pointsToBBox(normalizePoints(selectedCandidate.points))

            if (bbox) {
                const baseId = `vision-${slugify(selectedCandidate.id || selectedCandidate.label)}`
                const id = uniqueId(baseId, usedIds)

                citations.unshift({
                    id,
                    kind: selectedCandidate.geometryType === "polygon" ? "region" : "object",
                    label: selectedCandidate.label,
                    detail: [
                        "AI-selected ranked visual target",
                        `rank ${selectedCandidate.rank}`,
                        `${Math.round(selectedCandidate.confidence * 100)}% visual confidence`,
                    ].join(" · "),
                    bbox: clampBBox(bbox),
                    target:
                        selectedCandidate.target === "both"
                            ? "both"
                            : selectedCandidate.target,
                    source: "vision",
                    role: "target",
                    confidence: clamp01(selectedCandidate.confidence),
                })
            }
        }
    }

    return citations
}

// -----------------------------------------------------------------------------
// NORMALIZATION
// -----------------------------------------------------------------------------

export function normalizeVisualAnalysis(
    raw: VisualAnalysisModelOutput,
): VisualAnalysisResult {
    const findings: VisualFinding[] = raw.findings.map((finding) => ({
        ...finding,
        id: finding.id.trim() || "target",
        label: finding.label.trim() || "Visual target",
        description: finding.description.trim(),
        bbox: finding.bbox ? normalizeBBox(finding.bbox) : null,
        points: normalizePoints(finding.points),
        confidence: clamp01(finding.confidence),
    }))

    const rankedCandidates: RankedCandidate[] =
        raw.rankedCandidates
            .map((candidate, index) => ({
                ...candidate,

                /*
                 * Qwen may omit rank even though the candidates are
                 * returned in ranked order.
                 *
                 * When rank is missing, use the candidate's position
                 * as the fallback rank.
                 */
                rank:
                    candidate.rank ??
                    index + 1,

                bbox: candidate.bbox
                    ? normalizeBBox(candidate.bbox)
                    : null,

                points: normalizePoints(
                    candidate.points,
                ),

                confidence: clamp01(
                    candidate.confidence,
                ),
            }))
            .sort(
                (a, b) =>
                    a.rank - b.rank,
            )
    let selectedFindingId = raw.selectedFindingId?.trim() || null

    // Keep selection internally consistent when the model supplies a selected
    // flag but forgets to repeat the corresponding ID.
    if (
        selectedFindingId === null &&
        findings.length > 0
    ) {
        const selected = findings.find((finding) => finding.selected)
        if (selected) selectedFindingId = selected.id
    }

    // If the selected ID points to a ranked candidate, it is still valid; the
    // citation layer can use that candidate's geometry as a defensive fallback.
    const selectedExists =
        selectedFindingId === null ||
        findings.some((finding) => finding.id === selectedFindingId) ||
        rankedCandidates.some((candidate) => candidate.id === selectedFindingId)

    if (!selectedExists) {
        selectedFindingId = null
    }

    const normalizedFindings = findings.map((finding) => ({
        ...finding,
        selected:
            selectedFindingId !== null
                ? finding.id === selectedFindingId
                : finding.selected,
    }))

    const measurement: MeasurementResult = {
        ...raw.measurement,
        value:
            typeof raw.measurement.value === "number" &&
            Number.isFinite(raw.measurement.value)
                ? raw.measurement.value
                : null,
        confidence: clamp01(raw.measurement.confidence),
        caveat: raw.measurement.caveat?.trim() || null,
        unit: raw.measurement.unit?.trim() || null,
    }

    return {
        answer: raw.answer.trim(),
        findings: normalizedFindings,
        rankedCandidates,
        selectedFindingId,
        measurement,
        observations: raw.observations
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 12),
        confidence: clamp01(raw.confidence),
    }
}

// -----------------------------------------------------------------------------
// GEOMETRY HELPERS
// -----------------------------------------------------------------------------

function normalizeGeometry(
    type: VisualFinding["geometryType"],
    rawPoints: {
        x: number
        y: number
    }[],
    rawBBox: BBox | null,
): OverlayGeometry | null {
    const points =
        normalizePoints(rawPoints)

    if (type === "line") {
        return points.length >= 2
            ? {
                type: "line",
                points,
                strokeWidth: 2,
            }
            : null
    }

    if (type === "polygon") {
        return points.length >= 3
            ? {
                type: "polygon",
                points,
                strokeWidth: 1.5,
            }
            : null
    }

    if (type === "point") {
        const point =
            points[0] ??
            (rawBBox
                ? {
                    x:
                        rawBBox.x +
                        rawBBox.w / 2,
                    y:
                        rawBBox.y +
                        rawBBox.h / 2,
                }
                : null)

        return point
            ? {
                type: "point",
                points: [
                    {
                        x: clamp01(point.x),
                        y: clamp01(point.y),
                    },
                ],
            }
            : null
    }

    return null
}

function pointsToBBox(
    points: {
        x: number
        y: number
    }[],
): BBox | null {
    if (!points.length) {
        return null
    }

    const xs = points.map(
        (point) => point.x,
    )

    const ys = points.map(
        (point) => point.y,
    )

    return clampBBox({
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(
            0.005,
            Math.max(...xs) -
            Math.min(...xs),
        ),
        h: Math.max(
            0.005,
            Math.max(...ys) -
            Math.min(...ys),
        ),
    })
}

function geometryToBBox(
    geometry: OverlayGeometry | null,
): BBox | null {
    if (
        !geometry ||
        !geometry.points.length
    ) {
        return null
    }

    const xs = geometry.points.map(
        (point) => point.x,
    )

    const ys = geometry.points.map(
        (point) => point.y,
    )

    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    if (geometry.type === "point") {
        const radius = 0.018

        return clampBBox({
            x: minX - radius,
            y: minY - radius,
            w: radius * 2,
            h: radius * 2,
        })
    }

    return clampBBox({
        x: minX,
        y: minY,
        w: Math.max(
            0.005,
            maxX - minX,
        ),
        h: Math.max(
            0.005,
            maxY - minY,
        ),
    })
}

function normalizePoints(
    points: {
        x: number
        y: number
    }[],
): {
    x: number
    y: number
}[] {
    if (!points.length) {
        return []
    }

    const scale =
        points.some(
            (point) =>
                Math.abs(point.x) > 1 ||
                Math.abs(point.y) > 1,
        )
            ? 100
            : 1

    return points
        .slice(0, 32)
        .map((point) => ({
            x: clamp01(
                point.x / scale,
            ),
            y: clamp01(
                point.y / scale,
            ),
        }))
}

function normalizeBBox(
    bbox: BBox,
): BBox {
    const scale =
        Math.abs(bbox.x) > 1 ||
        Math.abs(bbox.y) > 1 ||
        Math.abs(bbox.w) > 1 ||
        Math.abs(bbox.h) > 1
            ? 100
            : 1

    return clampBBox({
        x: bbox.x / scale,
        y: bbox.y / scale,
        w: bbox.w / scale,
        h: bbox.h / scale,
    })
}

function clampBBox(
    bbox: BBox,
): BBox {
    const x = clamp01(bbox.x)
    const y = clamp01(bbox.y)

    return {
        x,
        y,
        w: Math.max(
            0.005,
            Math.min(
                1 - x,
                Math.abs(bbox.w),
            ),
        ),
        h: Math.max(
            0.005,
            Math.min(
                1 - y,
                Math.abs(bbox.h),
            ),
        ),
    }
}

function clamp01(
    value: number,
): number {
    if (!Number.isFinite(value)) {
        return 0
    }

    return Math.max(
        0,
        Math.min(1, value),
    )
}

function slugify(
    value: string,
): string {
    return (
        value
            .toLowerCase()
            .replace(
                /[^a-z0-9]+/g,
                "-",
            )
            .replace(
                /^-+|-+$/g,
                "",
            )
            .slice(0, 48) ||
        "target"
    )
}

function uniqueId(
    base: string,
    used: Set<string>,
): string {
    let id = base
    let index = 2

    while (used.has(id)) {
        id = `${base}-${index}`
        index += 1
    }

    used.add(id)

    return id
}