import { createGroq } from "@ai-sdk/groq"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import type { LanguageModel } from "ai"
import type {
  Intent,
  ProviderId,
  QueryPlan,
  Scene,
} from "./types"

type Tier = {
  id: Exclude<ProviderId, "offline">
  label: string
  short: string
  model: LanguageModel
}

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const PRIMARY: Tier = {
  id: "groq",
  label: "Groq · Qwen 3.6 27B",
  short: "Groq",
  model: groq("qwen/qwen3.6-27b"),
}

export const FALLBACK: Tier = {
  id: "gemini",
  label: "Google · Gemini 3.6 Flash",
  short: "Gemini",
  model: google("gemini-3.6-flash"),
}

export const PROVIDER_META: Record<
    ProviderId,
    { label: string; short: string }
> = {
  groq: {
    label: PRIMARY.label,
    short: PRIMARY.short,
  },
  gemini: {
    label: FALLBACK.label,
    short: FALLBACK.short,
  },
  offline: {
    label: "Offline grounded fallback",
    short: "Offline",
  },
}

export type ClassifyOutput = {
  intent: Intent
  confidence: number
  rationale: string
  provider: ProviderId
  plan: QueryPlan
}

/**
 * The router is deliberately deterministic.
 *
 * It does not answer the question. It only extracts the operation
 * so the vision model knows what kind of visual work it must perform.
 */
export function classifyIntent(
    query: string,
    scene: Scene,
): ClassifyOutput {
  const plan = parseQueryPlan(query, scene)
  const result = heuristicIntent(query, scene, plan)

  return {
    ...result,
    provider: "offline",
    plan,
  }
}

export function parseQueryPlan(
    query: string,
    scene: Scene,
): QueryPlan {
  const q = normalize(query)

  const ordinalMatch = q.match(
      /\b(\d+)(?:st|nd|rd|th)\b|\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last)\b/,
  )

  const ordinalWordMap: Record<string, number> = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
    sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
    last: -1,
  }

  let ordinal: number | null = null
  if (ordinalMatch) {
    ordinal = ordinalMatch[1]
        ? Number(ordinalMatch[1])
        : ordinalWordMap[ordinalMatch[2]] ?? null
  }

  const largestRequested = /\b(largest|biggest|greatest|widest|broadest|most extensive)\b/.test(q)
  const smallestRequested = /\b(smallest|tiniest|narrowest|least extensive)\b/.test(q)
  const longestRequested = /\b(longest|most elongated)\b/.test(q)
  const shortestRequested = /\b(shortest|least long)\b/.test(q)
  const deepestRequested = /\b(deepest|deepest[- ]looking|greatest depth)\b/.test(q)
  const nearestRequested = /\b(closest|nearest)\b/.test(q)
  const farthestRequested = /\b(farthest|furthest)\b/.test(q)
  const brightestRequested = /\b(brightest|most bright|highest[- ]brightness)\b/.test(q)
  const strongestSarRequested = /\b(strongest[- ]backscatter|highest[- ]backscatter|strongest[- ]sar|brightest[- ]sar)\b/.test(q)

  const ranking =
      largestRequested || smallestRequested ? "area" :
          longestRequested || shortestRequested ? "length" :
              deepestRequested ? "depth" :
                  nearestRequested || farthestRequested ? "distance" :
                      brightestRequested || strongestSarRequested ? "brightness" :
                          ordinal !== null ? "area" : null

  const measurement =
      /\b(depth|deepth)\b/.test(q) ? "depth" :
          /\b(diameter|across|width)\b/.test(q) ? "diameter" :
              /\b(length|long|distance|far|away)\b/.test(q) ? "length" :
                  /\b(height|tall|high)\b/.test(q) ? "height" :
                      /\b(area|coverage|percent|percentage)\b/.test(q) ? "area" :
                          /\b(how many|count|number of|how much|quantity of)\b/.test(q) ? "count" : "none"

  const changeRequested = /(change|changed|before|after|difference|grew|growth|expanded|expansion|flood|flooded|over time|increase|decrease|removed|new area|temporal|earlier|later|loss|gained|retreated|inundated)/.test(q)

  const fusionRequested = /(fuse|fusion|both sensors|combine(?:d)? .*sensor|optical.*sar|sar.*optical|radar.*optical|optical.*radar|cross[- ]sensor)/.test(q)
  const sarRequested = /\b(sar|radar|backscatter|cpr|dual[- ]frequency)\b/.test(q)

  const compareRequested = /\b(compare|comparison|versus|vs|difference between|differ|similar|same as|more than|less than|larger than|smaller than|higher than|lower than)\b/.test(q)

  const rankingRequested =
      ordinal !== null || ranking !== null ||
      /\b(rank|ranking|top\s+\d+|bottom\s+\d+|second[- ]largest|third[- ]largest|second[- ]smallest|most|least|largest|smallest|longest|shortest|deepest|closest|nearest|farthest|furthest|brightest|strongest)\b/.test(q)

  const candidateSearchRequested =
      rankingRequested || compareRequested ||
      /\b(all|each|every|multiple|several|any of|which one|which object|which feature)\b/.test(q)

  const groundingRequested =
      /(show|point to|point at|where is|where are|locate|location of|delineate|outline|highlight|mark|find|identify|circle|trace|box|bounding box)/.test(q) ||
      ordinal !== null || ranking !== null || candidateSearchRequested ||
      (measurement !== "none" && /(bridge|road|river|building|crater|ship|vessel|lake|water|area|region|object|feature|tower|vehicle|settlement|flood|ice|shadow)/.test(q))

  const countRequested = measurement === "count" || /\b(how many|count|number of|quantity of)\b/.test(q)

  const operation: QueryPlan["operation"] =
      changeRequested ? "change" :
          fusionRequested ? "fusion" :
              countRequested ? "count" :
                  rankingRequested ? "rank" :
                      groundingRequested ? (measurement !== "none" ? "measure" : "identify") :
                          compareRequested ? "compare" :
                              /(why|how does|what does .* reveal|what can .* reveal|explain|reason)/.test(q) ? "explain" :
                                  /(describe|description|summary|summarize|overview|what is this|what does this show|caption)/.test(q) ? "describe" : "answer"

  const requestedModality: QueryPlan["requestedModality"] =
      fusionRequested || /\b(both sensors|both modalities|combine|fusion|fused)\b/.test(q) ? "both" :
          sarRequested ? "sar" :
              /\boptical\b/.test(q) ? "optical" : "auto"

  const targetHint = extractTargetHint(q)

  const regionHint = /(harbor|harbour|water body|river|channel|floodplain|crater floor|shadowed region|permanently shadowed region|downtown|park|field|settlement|city|urban fringe|coast|coastal area|shoreline|lake|basin|valley|delta|eastern part|western part|northern part|southern part)/.exec(q)?.[1] ?? null

  const spatialRelation = /(closest to|nearest to|farthest from|furthest from|crossing|inside|within|near|next to|along|between|across|outside|around|adjacent to|beside|upstream of|downstream of|over|under)/.exec(q)?.[1] ?? null

  return {
    operation,
    targetHint,
    regionHint,
    spatialRelation,
    ordinal,
    ranking,
    measurement,
    requestedModality,
    requiresGrounding: groundingRequested,
    requiresComparison: rankingRequested || compareRequested,
    requiresMeasurement: measurement !== "none",
    requiresCandidateSearch: candidateSearchRequested,
  }
}

export function heuristicIntent(
    query: string,
    scene: Scene,
    plan = parseQueryPlan(query, scene),
): {
  intent: Intent
  confidence: number
  rationale: string
} {
  const q = normalize(query)

  const score: Record<Intent, number> = {
    caption: 0,
    vqa: 0,
    grounding: 0,
    change: 0,
    fusion: 0,
  }

  if (plan.operation === "describe") {
    score.caption += 6
  }

  if (
      plan.operation === "count" ||
      plan.operation === "answer" ||
      plan.operation === "measure" ||
      plan.operation === "explain"
  ) {
    score.vqa += 4
  }

  if (plan.requiresGrounding) {
    score.grounding += 6
  }

  if (plan.operation === "change") {
    score.change += 8
  }

  if (plan.operation === "fusion") {
    score.fusion += 8
  }

  if (
      /(describe|description|summar|summary|overview|what is this|what does this show|caption)/.test(
          q,
      )
  ) {
    score.caption += 3
  }

  if (
      /(how many|count|number of|is there|are there|what color|which|does it have|dominant|how much|present)/.test(
          q,
      )
  ) {
    score.vqa += 2
  }

  if (
      /(change|before|after|difference|grew|growth|expanded|expansion|flood|flooded|between the two|two dates|over time|increase|decrease|removed|new area|temporal|earlier|later)/.test(
          q,
      )
  ) {
    score.change += 3
  }

  if (plan.operation === "fusion") {
    score.fusion += 3
  }

  let best: Intent = scene.availableIntents[0]
  let bestScore = -1

  for (const intent of scene.availableIntents) {
    if (score[intent] > bestScore) {
      bestScore = score[intent]
      best = intent
    }
  }

  const confidence =
      bestScore <= 0
          ? 0.55
          : Math.min(
              0.94,
              0.58 + bestScore * 0.055,
          )

  return {
    intent: best,
    confidence,
    rationale:
        "Parsed locally for routing only; visual interpretation, candidate search, ranking, grounding, and measurement are delegated to the vision model.",
  }
}

function normalize(query: string): string {
  return query
      .toLowerCase()
      .replace(/[?.,!]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
}

function extractTargetHint(
    query: string,
): string | null {
  const q = query.trim()

  const rankingPatterns = [
    /\b(?:which|what)\s+(?:is|are)\s+(?:the\s+)?(?:(?:\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last)\s+)?(?:largest|smallest|biggest|longest|shortest|deepest|closest|nearest|farthest|furthest|brightest|strongest)\s+(.+?)(?:\s+(?:in|inside|within|near|around|and|with|what|where)\b|$)/i,
    /\b(?:identify|find|locate|show|point to|point at)\s+(?:the\s+)?(?:(?:\d+(?:st|nd|rd|th)|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last)\s+)?(?:largest|smallest|biggest|longest|shortest|deepest|closest|nearest|farthest|furthest|brightest|strongest)\s+(.+?)(?:\s+(?:in|inside|within|near|around|and|with|what|where)\b|$)/i,
  ]

  for (const pattern of rankingPatterns) {
    const match = q.match(pattern)
    if (match?.[1]) return cleanTarget(match[1])
  }

  const countMatch = q.match(
      /^(?:how many|count|number of|quantity of)\s+(.+?)(?:\s+(?:in|inside|within|near|around|on|along|at)\b|$)/i,
  )
  if (countMatch?.[1]) return cleanTarget(countMatch[1])

  const existenceMatch = q.match(
      /^(?:is there|are there)\s+(?:a|an|any)?\s*(.+?)(?:\s+(?:in|inside|within|near|around|on|along|at)\b|$)/i,
  )
  if (existenceMatch?.[1]) return cleanTarget(existenceMatch[1])

  const actionMatch = q.match(
      /\b(?:show|point to|point at|locate|find|identify|mark|highlight|delineate|outline|where is|where are|circle|trace|detect)\s+(?:the|a|an|any)?\s*(.+?)(?:\s+(?:in|inside|within|near|around|and|then|with|what|how|tell|give)\b|$)/i,
  )
  if (actionMatch?.[1]) {
    const target = cleanTarget(actionMatch[1])
    if (target && !/^(it|this|that|them|those|these)$/i.test(target)) {
      return target
    }
  }

  const nounMatch = q.match(
      /\b(craters?|ships?|vessels?|boats?|bridges?|roads?|rivers?|lakes?|water bodies?|buildings?|vehicles?|aircraft|runways?|fields?|settlements?|houses?|trees?|forest|flood(?:ed|ing)? areas?|ice|shadow(?:ed)? regions?|basins?|channels?|shorelines?|coastlines?|islands?|mountains?|hills?|towers?|structures?|urban areas?)\b/i,
  )
  if (nounMatch?.[1]) return cleanTarget(nounMatch[1])

  return null
}

function cleanTarget(value: string): string | null {
  const candidate = value
      .replace(/\b(the|a|an|any)\b/gi, "")
      .replace(/\b(please|me|this|that|image|scene|visible)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()

  return candidate.length >= 2 ? candidate.slice(0, 100) : null
}
