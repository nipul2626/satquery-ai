import { generateText } from "ai"
import { PRIMARY, FALLBACK } from "@/lib/ai"
import type { ProviderId } from "@/lib/types"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: Request) {
  let image: unknown
  let query: unknown

  try {
    const body = await req.json()
    image = body.image
    query = body.query
  } catch {
    return Response.json(
        {
          ok: false,
          error: "Malformed request.",
        },
        { status: 400 },
    )
  }

  // Validate uploaded image
  if (typeof image !== "string" || !image.startsWith("data:image/")) {
    return Response.json(
        {
          ok: false,
          error: "A valid image upload is required.",
        },
        { status: 400 },
    )
  }

  const question =
      typeof query === "string" && query.trim()
          ? query.trim()
          : "Describe this image in detail."

  const instruction = [
    "You are a remote-sensing analyst inspecting a USER-UPLOADED image.",
    "This is an EXPLORATORY analysis and does not have curated ground truth.",
    "",
    "Rules:",
    "- Describe only what is visually supported by the image.",
    "- Never invent coordinates, sensors, dates, or precise measurements.",
    "- Quantitative claims such as counts or areas must be described as visual estimates.",
    "- If the image does not appear to be satellite or aerial imagery, say so.",
    "- Be concise: 3-6 sentences.",
    "- Answer the user's actual question.",
    "",
    `USER QUESTION: ${question}`,
  ].join("\n")

  // Try Groq first, then Gemini.
  const tiers = [PRIMARY, FALLBACK]

  for (const tier of tiers) {
    try {
      const { text } = await generateText({
        model: tier.model,

        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: instruction,
              },
              {
                type: "image",
                image,
              },
            ],
          },
        ],

        maxOutputTokens: 500,
        temperature: 0.2,
      })

      const answer = text?.trim()

      if (!answer) {
        throw new Error("empty model response")
      }

      return Response.json({
        ok: true,
        provider: tier.id,
        exploratory: true,
        answer,
      })
    } catch (err) {
      console.error(
          `[satquery] exploratory analysis failed on ${tier.id}:`,
          err instanceof Error ? err.message : err,
      )
    }
  }

  // Both providers failed.
  return Response.json({
    ok: true,
    provider: "offline" as ProviderId,
    exploratory: true,
    unavailable: true,
    answer:
        "Exploratory vision analysis is currently unavailable. The image was received, but no vision model could be reached.",
  })
}