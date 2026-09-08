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

// -----------------------------------------------------------------------------
// GROQ RATE-LIMIT PROTECTION
// -----------------------------------------------------------------------------
//
// Groq applies organization-level input-token-per-minute limits.
//
// Qwen 3.6 vision requests can be large because every attached image contributes
// vision input tokens. Two-image scenes such as flood before/after or optical/SAR
// can therefore hit the ITPM limit much faster than simple text requests.
//
// We keep a short local cooldown after a rate-limit response so repeated demo
// queries don't continuously hammer Groq while the same rate-limit window is
// active.
//

let groqRateLimitedUntil = 0

const GROQ_RATE_LIMIT_COOLDOWN_MS = 15_000
const GROQ_RATE_LIMIT_RETRY_MS = 11_000

// -----------------------------------------------------------------------------
// RESPONSE HELPER
// -----------------------------------------------------------------------------

function jsonResponse(
    payload: SynthesisResponse,
    status = 200,
): Response {
    return new Response(
        JSON.stringify(payload),
        {
            status,
            headers: {
                "content-type":
                    "application/json; charset=utf-8",
                "x-satquery-provider":
                payload.provider,
                "cache-control":
                    "no-cache, no-store",
            },
        },
    )
}

// -----------------------------------------------------------------------------
// SMALL ASYNC WAIT HELPER
// -----------------------------------------------------------------------------

function wait(
    milliseconds: number,
): Promise<void> {
    return new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                milliseconds,
            ),
    )
}

// -----------------------------------------------------------------------------
// CITATION MERGING
// -----------------------------------------------------------------------------

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
// ERROR CLASSIFICATION
// -----------------------------------------------------------------------------

function isGroqRateLimitError(
    error: unknown,
): boolean {
    const message =
        error instanceof Error
            ? error.message
            : String(error)

    return /rate limit|429|ITPM|tokens per minute|too many requests/i.test(
        message,
    )
}

// -----------------------------------------------------------------------------
// JSON EXTRACTION
// -----------------------------------------------------------------------------

function extractJsonObject(
    text: string,
): unknown {
    const cleaned = text
        .trim()
        .replace(
            /^```(?:json)?\s*/i,
            "",
        )
        .replace(
            /\s*```$/i,
            "",
        )
        .trim()

    // Direct JSON
    try {
        return JSON.parse(cleaned)
    } catch {
        // Continue below.
    }

    const firstBrace =
        cleaned.indexOf("{")

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
        const char =
            cleaned[index]

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
                const candidate =
                    cleaned.slice(
                        firstBrace,
                        index + 1,
                    )

                try {
                    return JSON.parse(
                        candidate,
                    )
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
//
// Qwen 3.6 supports vision + JSON Object Mode.
//
// We intentionally do NOT use Output.object() here.
// The JSON is parsed locally and validated with Zod.
//
// 950 output tokens keeps us below the current Groq organization OTPM limit
// of 1000 while still giving ranking/comparison questions enough room.
//

async function runGroqVision(
    content: VisionContentPart[],
): Promise<VisualAnalysisResult> {
    console.log(
        "[satquery] Groq: Qwen 3.6 Vision + JSON Object Mode",
    )

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

    const text =
        result.text?.trim()

    if (!text) {
        throw new Error(
            "Groq returned an empty response",
        )
    }

    const raw =
        extractJsonObject(text)

    return validateVisualAnalysis(raw)
}

// -----------------------------------------------------------------------------
// GEMINI VISION
// -----------------------------------------------------------------------------
//
// Gemini is deliberately handled without provider-side schema enforcement.
// We ask for JSON in the prompt and validate the returned text ourselves.
//

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

    const text =
        result.text?.trim()

    if (!text) {
        throw new Error(
            "Gemini returned an empty response",
        )
    }

    const raw =
        extractJsonObject(text)

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

        /*
         * IMPORTANT:
         *
         * The EvidenceStore is supporting context.
         * The actual satellite pixels remain the primary source for visual
         * discovery, grounding, ranking, and comparison.
         *
         * We intentionally cap the amount of evidence sent to the vision model.
         * This reduces Groq input-token pressure, especially for two-image
         * scenes such as flood before/after and optical/SAR pairs.
         */
        const evidenceText =
            formatCitationsForModel(
                citations,
            ).slice(0, 3000)

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

        /*
         * buildSynthesisPrompt contains useful scene context, but sending a
         * very large text payload together with two vision images can push the
         * request over Groq's organization ITPM limit.
         *
         * Keep the useful beginning of the context while preventing accidental
         * prompt bloat.
         */
        const baseContext =
            buildSynthesisPrompt(
                scene,
                intent,
                query,
                citations,
            ).slice(0, 4000)

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
         * This is important because previous vision responses occasionally
         * returned only part of the required schema.
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

            /*
             * If Groq was recently rate-limited, don't immediately hammer the
             * same organization-level limit again.
             *
             * Gemini will be used as the fallback during this cooldown.
             */
            if (
                Date.now() <
                groqRateLimitedUntil
            ) {
                throw new Error(
                    "Groq temporarily rate-limited; using Gemini fallback",
                )
            }

            let visual: VisualAnalysisResult

            try {
                visual =
                    await runGroqVision(
                        content,
                    )
            } catch (error) {
                /*
                 * Groq's error often contains a recommended wait time.
                 *
                 * Give it one short retry after the current minute window has
                 * had time to release tokens. We only do this for actual rate
                 * limits; validation/model errors go directly to Gemini.
                 */
                if (
                    !isGroqRateLimitError(
                        error,
                    )
                ) {
                    throw error
                }

                groqRateLimitedUntil =
                    Date.now() +
                    GROQ_RATE_LIMIT_COOLDOWN_MS

                console.warn(
                    "[satquery] Groq rate-limited; waiting briefly before retry",
                )

                await wait(
                    GROQ_RATE_LIMIT_RETRY_MS,
                )

                /*
                 * The cooldown may have expired naturally while waiting.
                 * If another concurrent request already extended it, skip the
                 * second call and fall through to Gemini.
                 */
                if (
                    Date.now() <
                    groqRateLimitedUntil
                ) {
                    throw new Error(
                        "Groq rate limit still active; switching to Gemini",
                    )
                }

                visual =
                    await runGroqVision(
                        content,
                    )

                /*
                 * Successful Groq retry means the rate-limit condition has
                 * cleared.
                 */
                groqRateLimitedUntil = 0
            }

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
                confidence:
                visual.confidence,
            })
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : String(error)

            if (
                isGroqRateLimitError(
                    error,
                )
            ) {
                groqRateLimitedUntil =
                    Date.now() +
                    GROQ_RATE_LIMIT_COOLDOWN_MS

                console.warn(
                    "[satquery] Groq rate-limited; temporarily switching to Gemini",
                )
            } else {
                console.error(
                    "[satquery] Groq vision failed:",
                    message,
                )
            }
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
                confidence:
                visual.confidence,
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