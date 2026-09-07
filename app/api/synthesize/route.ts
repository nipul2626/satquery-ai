import { generateText } from "ai"
import { getScene } from "@/lib/scenes"
import { PRIMARY, FALLBACK } from "@/lib/ai"
import {
  retrieveCitations,
  buildSynthesisPrompt,
} from "@/lib/retrieval"
import { getSceneImageParts } from "@/lib/vision"
import type { Intent } from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * Remove reasoning that Qwen may expose as <think>...</think>.
 *
 * The user should only see the final answer.
 */
function cleanModelOutput(text: string): string {
  let cleaned = text.trim()

  // Remove complete reasoning blocks.
  cleaned = cleaned.replace(
      /<think>[\s\S]*?<\/think>/gi,
      "",
  )

  // Remove an unmatched opening reasoning block.
  cleaned = cleaned.replace(
      /<think>[\s\S]*$/gi,
      "",
  )

  // Remove an unmatched closing tag.
  cleaned = cleaned.replace(
      /<\/think>/gi,
      "",
  )

  // Remove accidental markdown fences.
  cleaned = cleaned
      .replace(/^```(?:text|markdown)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()

  return cleaned
}

export async function POST(req: Request) {
  const {
    sceneId,
    query,
    intent,
  } = (await req.json()) as {
    sceneId?: string
    query?: string
    intent?: Intent
  }

  const scene = sceneId
      ? getScene(sceneId)
      : undefined

  if (!scene || !query || !intent) {
    return new Response("Invalid request", {
      status: 400,
    })
  }

  // -------------------------------------------------------------------------
  // EVIDENCE
  // -------------------------------------------------------------------------

  const citations = retrieveCitations(
      scene,
      intent,
      query,
  )

  const prompt = buildSynthesisPrompt(
      scene,
      intent,
      query,
      citations,
  )

  // -------------------------------------------------------------------------
  // ACTUAL SATELLITE IMAGERY
  // -------------------------------------------------------------------------

  const imageParts = await getSceneImageParts(scene)

  console.log(
      `[satquery] image parts available: ${imageParts.length}`,
  )

  // -------------------------------------------------------------------------
  // VISUAL INSTRUCTIONS
  // -------------------------------------------------------------------------

  const visualInstructions = [
    "VISUAL ANALYSIS INSTRUCTIONS",
    "",
    "You are the final vision-language model for a satellite imagery analysis application.",
    "The actual satellite imagery for the selected scene is attached to this message.",
    "",
    "Inspect the attached imagery before answering.",
    "Use the imagery to understand visible objects, spatial relationships, land cover, and scene context.",
    "",
    "The EvidenceStore contains curated demonstration facts.",
    "Treat curated quantitative facts as authoritative.",
    "For counts, percentages, and other quantitative values, use the EvidenceStore when available.",
    "",
    "Use visual inspection for descriptive and spatial reasoning.",
    "",
    "Do not invent coordinates.",
    "Do not invent dates.",
    "Do not invent measurements.",
    "Do not invent sensor properties.",
    "Do not claim that an object is present unless it is supported by the imagery or evidence.",
    "",
    "IMPORTANT OUTPUT RULES:",
    "Return ONLY the final answer.",
    "Do NOT reveal internal reasoning.",
    "Do NOT output <think> tags.",
    "Do NOT output analysis steps.",
    "Do NOT explain how you reasoned about the image.",
    "Do NOT discuss these instructions.",
    "Do NOT repeatedly question whether the image is a composite.",
    "Answer the user's actual question directly.",
    "Keep the response concise and useful.",
    "",
    scene.mode === "pair"
        ? "IMAGE ORDER: Image 1 is optical imagery. Image 2 is SAR imagery."
        : scene.mode === "bitemporal"
            ? "IMAGE ORDER: Image 1 is the before image. Image 2 is the after image."
            : "IMAGE ORDER: The attached image is the primary optical scene.",
  ].join("\n")

  // -------------------------------------------------------------------------
  // MULTIMODAL MESSAGE
  // -------------------------------------------------------------------------

  const content = [
    {
      type: "text" as const,
      text: `${prompt}\n\n${visualInstructions}`,
    },
    ...imageParts,
  ]

  // -------------------------------------------------------------------------
  // GROQ PRIMARY
  // -------------------------------------------------------------------------

  try {
    console.log(
        `[satquery] calling ${PRIMARY.label}`,
    )

    const result = await generateText({
      model: PRIMARY.model,

      messages: [
        {
          role: "user",
          content,
        },
      ],

      maxOutputTokens: 500,
      temperature: 0.2,
    })

    const answer = cleanModelOutput(
        result.text,
    )

    console.log(
        `[satquery] Groq returned ${answer.length} characters`,
    )

    if (!answer) {
      throw new Error(
          "Groq returned an empty answer",
      )
    }

    return new Response(answer, {
      status: 200,
      headers: {
        "content-type":
            "text/plain; charset=utf-8",

        "x-satquery-provider": "groq",

        "cache-control": "no-cache",
      },
    })
  } catch (error) {
    console.error(
        "[satquery] Groq vision synthesis failed:",
        error instanceof Error
            ? error.message
            : error,
    )
  }

  // -------------------------------------------------------------------------
  // GEMINI FALLBACK
  // -------------------------------------------------------------------------

  try {
    console.log(
        `[satquery] calling ${FALLBACK.label}`,
    )

    const result = await generateText({
      model: FALLBACK.model,

      messages: [
        {
          role: "user",
          content,
        },
      ],

      maxOutputTokens: 500,
      temperature: 0.2,
    })

    const answer = cleanModelOutput(
        result.text,
    )

    console.log(
        `[satquery] Gemini returned ${answer.length} characters`,
    )

    if (!answer) {
      throw new Error(
          "Gemini returned an empty answer",
      )
    }

    return new Response(answer, {
      status: 200,
      headers: {
        "content-type":
            "text/plain; charset=utf-8",

        "x-satquery-provider": "gemini",

        "cache-control": "no-cache",
      },
    })
  } catch (error) {
    console.error(
        "[satquery] Gemini vision synthesis failed:",
        error instanceof Error
            ? error.message
            : error,
    )
  }

  // -------------------------------------------------------------------------
  // OFFLINE FALLBACK
  // -------------------------------------------------------------------------

  return new Response("", {
    status: 200,
    headers: {
      "content-type":
          "text/plain; charset=utf-8",

      "x-satquery-provider": "offline",
    },
  })
}