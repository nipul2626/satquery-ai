import { generateText } from "ai"

import { getScene } from "@/lib/scenes"

import {
    PRIMARY,
    FALLBACK,
    parseQueryPlan,
} from "@/lib/ai"

import {
    retrieveCitations,
    formatCitationsForModel,
    buildSynthesisPrompt,
} from "@/lib/retrieval"

import {
    getSceneImageParts,
    VisualAnalysisSchema,
    buildVisualAnalysisInstructions,
    normalizeVisualAnalysis,
    visualAnalysisToCitations,
} from "@/lib/vision"

import type {
    Citation,
    Intent,
    SynthesisResponse,
    VisualAnalysisResult,
} from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 90

type RequestBody = {
    sceneId?: string
    query?: string
    intent?: Intent
}

type VisionContentPart =
    | {
    type: "text"
    text: string
}
    | {
    type: "file"
    data: Buffer
    mediaType: string
}

function jsonResponse(
    payload: SynthesisResponse,
    status = 200,
): Response {
    return new Response(
        JSON.stringify(payload),
        {
            status,
            headers: {
                "content-type": "application/json; charset=utf-8",
                "x-satquery-provider": payload.provider,
                "cache-control": "no-cache, no-store",
            },
        },
    )
}

function mergeCitations(
    visionCitations: Citation[],
    evidenceCitations: Citation[],
): Citation[] {
    const seen = new Set<string>()
    const merged: Citation[] = []

    for (const citation of [
        ...visionCitations,
        ...evidenceCitations,
    ]) {
        if (seen.has(citation.id)) {
            continue
        }

        seen.add(citation.id)
        merged.push(citation)
    }

    return merged
}

// -----------------------------------------------------------------------------
// JSON EXTRACTION
// -----------------------------------------------------------------------------

function extractJsonObject(text: string): unknown {
    const cleaned = text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()

    // Direct JSON
    try {
        return JSON.parse(cleaned)
    } catch {
        // Continue below.
    }

    const firstBrace = cleaned.indexOf("{")

    if (firstBrace === -1) {
        throw new Error(
            "Vision model did not return a JSON object",
        )
    }

    let depth = 0
    let inString = false
    let escaped = false

    for (
        let index = firstBrace;
        index < cleaned.length;
        index += 1
    ) {
        const char = cleaned[index]

        if (escaped) {
            escaped = false
            continue
        }

        if (char === "\\") {
            escaped = true
            continue
        }

        if (char === '"') {
            inString = !inString
            continue
        }

        if (inString) {
            continue
        }

        if (char === "{") {
            depth += 1
        }

        if (char === "}") {
            depth -= 1

            if (depth === 0) {
                const candidate = cleaned.slice(
                    firstBrace,
                    index + 1,
                )

                try {
                    return JSON.parse(candidate)
                } catch {
                    throw new Error(
                        "Vision model returned malformed JSON",
                    )
                }
            }
        }
    }

    throw new Error(
        "Vision model returned incomplete JSON",
    )
}

// -----------------------------------------------------------------------------
// VISUAL ANALYSIS VALIDATION
// -----------------------------------------------------------------------------

function validateVisualAnalysis(
    raw: unknown,
): VisualAnalysisResult {
    const parsed =
        VisualAnalysisSchema.safeParse(raw)

    if (!parsed.success) {
        const details =
            parsed.error.issues
                .slice(0, 8)
                .map(
                    (issue) =>
                        `${issue.path.join(".")}: ${issue.message}`,
                )
                .join("; ")

        throw new Error(
            `Vision JSON failed local validation: ${details}`,
        )
    }

    return normalizeVisualAnalysis(
        parsed.data,
    )
}

// -----------------------------------------------------------------------------
// GROQ VISION
// -----------------------------------------------------------------------------

async function runGroqVision(
    content: VisionContentPart[],
): Promise<VisualAnalysisResult> {
    console.log(
        "[satquery] Groq: Qwen 3.6 Vision + JSON Object Mode",
    )

    /*
     * IMPORTANT:
     *
     * Do NOT use Output.object() here.
     *
     * Qwen 3.6 is being used in JSON Object Mode.
     * The JSON is parsed locally and validated with Zod.
     *
     * 700 tokens keeps us safely below the current
     * Groq organization OTPM limit of 1000.
     */
    const result = await generateText({
        model: PRIMARY.model,

        providerOptions: {
            groq: {
                structuredOutputs: false,
                reasoningFormat: "hidden",
                reasoningEffort: "none",
            },
        },

        messages: [
            {
                role: "user",
                content,
            },
        ],

        maxOutputTokens: 950,

        temperature: 0,

        maxRetries: 0,
    })

    const text = result.text?.trim()

    if (!text) {
        throw new Error(
            "Groq returned an empty response",
        )
    }

    const raw = extractJsonObject(text)

    return validateVisualAnalysis(raw)
}

// -----------------------------------------------------------------------------
// GEMINI VISION
// -----------------------------------------------------------------------------

async function runGeminiVision(
    content: VisionContentPart[],
): Promise<VisualAnalysisResult> {
    console.log(
        "[satquery] Gemini: plain JSON response + local validation",
    )

    const result = await generateText({
        model: FALLBACK.model,

        messages: [
            {
                role: "user",
                content,
            },
        ],

        maxOutputTokens: 950,
        temperature: 0,

        maxRetries: 0,
    })

    const text = result.text?.trim()

    if (!text) {
        throw new Error(
            "Gemini returned an empty response",
        )
    }

    const raw = extractJsonObject(text)

    return validateVisualAnalysis(raw)
}

// -----------------------------------------------------------------------------
// MAIN ROUTE
// -----------------------------------------------------------------------------

export async function POST(
    req: Request,
) {
    try {
        const {
            sceneId,
            query,
            intent,
        } = (await req.json()) as RequestBody

        const scene = sceneId
            ? getScene(sceneId)
            : undefined

        if (
            !scene ||
            !query ||
            !intent
        ) {
            return new Response(
                "Invalid request",
                {
                    status: 400,
                },
            )
        }

        // ---------------------------------------------------------------------
        // QUERY PLANNING
        // ---------------------------------------------------------------------

        const plan = parseQueryPlan(
            query,
            scene,
        )

        console.log(
            "[satquery] query plan:",
            plan,
        )

        // ---------------------------------------------------------------------
        // EVIDENCE RETRIEVAL
        // ---------------------------------------------------------------------

        const citations =
            retrieveCitations(
                scene,
                intent,
                query,
                plan,
            )

        const evidenceText =
            formatCitationsForModel(
                citations,
            )

        // ---------------------------------------------------------------------
        // LOAD ACTUAL SCENE IMAGE
        // ---------------------------------------------------------------------

        const imageParts =
            await getSceneImageParts(
                scene,
            )

        console.log(
            `[satquery] visual analysis: ${imageParts.length} image part(s)`,
        )

        if (!imageParts.length) {
            console.error(
                "[satquery] no scene image could be loaded",
            )
        }

        // ---------------------------------------------------------------------
        // MODEL PROMPT
        // ---------------------------------------------------------------------

        const baseContext =
            buildSynthesisPrompt(
                scene,
                intent,
                query,
                citations,
            )

        const instructions =
            buildVisualAnalysisInstructions(
                scene,
                query,
                plan,
                evidenceText,
            )

        /*
         * Add a very explicit compact-output instruction.
         *
         * This is important because your previous Groq response contained
         * only part of the required schema.
         */
        const compactJsonInstruction = `
OUTPUT REQUIREMENT:

Return exactly ONE complete JSON object.

Do not return markdown.
Do not return explanations outside the JSON.
Do not omit any required field.
Do not stop early.

The JSON must contain ALL of these top-level fields:

{
  "answer": "string",
  "findings": [],
  "rankedCandidates": [],
  "selectedFindingId": "string or null",
  "measurement": {
    "requested": "string",
    "value": "number or null",
    "unit": "string or null",
    "status": "evidence or visual-estimate or unsupported",
    "confidence": 0,
    "caveat": "string or null"
  },
  "observations": [],
  "confidence": 0
}

Keep the response compact.

For a simple counting question, return only the findings needed to support the count.
For a simple yes/no question, return only the relevant finding.
For a ranking question, return only the candidates needed for the ranking.
For grounding, include bounding boxes or points for the objects you actually identify.

Never invent coordinates.
Never invent measurements that cannot be visually supported.
Use null where a value is not applicable.
`

        const content: VisionContentPart[] = [
            {
                type: "text",
                text: [
                    baseContext,
                    "",
                    instructions,
                    "",
                    compactJsonInstruction,
                ].join("\n"),
            },
            ...imageParts,
        ]

        // ---------------------------------------------------------------------
        // PRIMARY: GROQ
        // ---------------------------------------------------------------------

        try {
            if (!imageParts.length) {
                throw new Error(
                    "Cannot perform vision analysis without scene imagery",
                )
            }

            const visual =
                await runGroqVision(
                    content,
                )

            const visionCitations =
                visualAnalysisToCitations(
                    visual,
                )

            const merged =
                mergeCitations(
                    visionCitations,
                    citations,
                )

            if (!visual.answer.trim()) {
                throw new Error(
                    "Groq returned an empty visual answer",
                )
            }

            console.log(
                `[satquery] Groq vision succeeded: ${visionCitations.length} visual finding(s)`,
            )

            return jsonResponse({
                ok: true,
                provider: "groq",
                answer: visual.answer,
                citations: merged,
                visualAnalysis: visual,
                confidence: visual.confidence,
            })
        } catch (error) {
            console.error(
                "[satquery] Groq vision failed:",
                error instanceof Error
                    ? error.message
                    : error,
            )
        }

        // ---------------------------------------------------------------------
        // FALLBACK: GEMINI
        // ---------------------------------------------------------------------

        try {
            if (!imageParts.length) {
                throw new Error(
                    "Cannot perform vision analysis without scene imagery",
                )
            }

            const visual =
                await runGeminiVision(
                    content,
                )

            const visionCitations =
                visualAnalysisToCitations(
                    visual,
                )

            const merged =
                mergeCitations(
                    visionCitations,
                    citations,
                )

            if (!visual.answer.trim()) {
                throw new Error(
                    "Gemini returned an empty visual answer",
                )
            }

            console.log(
                `[satquery] Gemini vision succeeded: ${visionCitations.length} visual finding(s)`,
            )

            return jsonResponse({
                ok: true,
                provider: "gemini",
                answer: visual.answer,
                citations: merged,
                visualAnalysis: visual,
                confidence: visual.confidence,
            })
        } catch (error) {
            console.error(
                "[satquery] Gemini vision failed:",
                error instanceof Error
                    ? error.message
                    : error,
            )
        }

        // ---------------------------------------------------------------------
        // OFFLINE FALLBACK
        // ---------------------------------------------------------------------

        const offlineAnswer =
            citations.length
                ? [
                    "The external vision providers could not complete the visual analysis.",
                    "",
                    ...citations.map(
                        (citation) =>
                            `• ${citation.label}: ${citation.detail}`,
                    ),
                ].join("\n")
                : "The external vision providers could not complete the visual analysis, and no curated evidence matched this query."

        console.warn(
            "[satquery] both vision providers failed; using offline evidence fallback",
        )

        return jsonResponse({
            ok: false,
            provider: "offline",
            answer: offlineAnswer,
            citations,
            visualAnalysis: null,
            confidence: 0,
        })
    } catch (error) {
        console.error(
            "[satquery] synthesize route error:",
            error instanceof Error
                ? error.message
                : error,
        )

        return new Response(
            JSON.stringify({
                error: "Synthesis failed",
            }),
            {
                status: 500,
                headers: {
                    "content-type":
                        "application/json; charset=utf-8",
                },
            },
        )
    }
}