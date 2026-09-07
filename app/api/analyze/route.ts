import { NextResponse } from "next/server"
import { getScene } from "@/lib/scenes"
import { validateQuery } from "@/lib/validator"
import {
  classifyIntent,
  PROVIDER_META,
} from "@/lib/ai"
import {
  retrieveCitations,
  computeConfidence,
  composeOfflineAnswer,
} from "@/lib/retrieval"
import {
  SPECIALISTS,
  INTENT_LABELS,
} from "@/lib/registry"
import type {
  AnalyzeResult,
  TraceStep,
} from "@/lib/types"

export const maxDuration = 30

export async function POST(
    req: Request,
) {
  const {
    sceneId,
    query,
  } = (await req.json()) as {
    sceneId?: string
    query?: string
  }

  const scene = sceneId
      ? getScene(sceneId)
      : undefined

  if (
      !scene ||
      typeof query !== "string"
  ) {
    return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 },
    )
  }

  const tValidate = Date.now()
  const validation =
      validateQuery(query, scene)
  const validateMs =
      Date.now() - tValidate

  if (!validation.ok) {
    return NextResponse.json(
        {
          error:
              validation.reason ??
              "Invalid query",
        },
        { status: 422 },
    )
  }

  const tClassify = Date.now()

  const classification =
      classifyIntent(
          validation.normalizedQuery,
          scene,
      )

  const classifyMs =
      Date.now() - tClassify

  const intent =
      classification.intent

  const specialist =
      SPECIALISTS[intent]

  const tRoute = Date.now()
  const routeMs =
      Math.max(
          1,
          Date.now() - tRoute,
      )

  const tRetrieve = Date.now()

  const citations =
      retrieveCitations(
          scene,
          intent,
          validation.normalizedQuery,
          classification.plan,
      )

  const retrieveMs =
      Math.max(
          1,
          Date.now() - tRetrieve,
      )

  const confidence =
      computeConfidence(
          scene,
          intent,
          classification.confidence,
          citations.length,
          validation.flags,
      )

  const offlineAnswer =
      composeOfflineAnswer(
          scene,
          intent,
          citations,
      )

  const trace: TraceStep[] = [
    {
      id: "validate",
      label: "Input Validation",
      detail:
          validation.flags.length
              ? `Normalized · flags: ${validation.flags.join(", ")}`
              : "Normalized · no flags raised",
      status: "done",
      durationMs: validateMs,
      meta: [
        {
          label: "length",
          value: `${validation.normalizedQuery.length} chars`,
        },
      ],
    },
    {
      id: "classify",
      label: "Query Understanding",
      detail:
      classification.rationale,
      status: "done",
      durationMs: classifyMs,
      meta: [
        {
          label: "intent",
          value:
              INTENT_LABELS[intent],
        },
        {
          label: "router",
          value:
          PROVIDER_META[
              classification.provider
              ].short,
        },
        {
          label: "operation",
          value:
          classification.plan.operation,
        },
        {
          label: "target",
          value:
              classification.plan
                  .targetHint ??
              "visual discovery",
        },
        {
          label: "grounding",
          value:
              classification.plan
                  .requiresGrounding
                  ? "required"
                  : "not required",
        },
        {
          label: "confidence",
          value: `${Math.round(
              classification.confidence *
              100,
          )}%`,
        },
      ],
    },
    {
      id: "route",
      label: "Specialist Routing",
      detail:
          `Dispatched to ${specialist.name}`,
      status: "done",
      durationMs: routeMs,
      meta: [
        {
          label: "specialist",
          value: specialist.name,
        },
        {
          label: "tools",
          value:
              specialist.tools.join(
                  ", ",
              ),
        },
      ],
    },
    {
      id: "retrieve",
      label: "Evidence Retrieval",
      detail:
          "Retrieved supporting scene evidence; novel visual targets are not blocked by missing evidence.",
      status: "done",
      durationMs: retrieveMs,
      meta: [
        {
          label: "support",
          value: String(
              citations.length,
          ),
        },
      ],
    },
    {
      id: "synthesize",
      label: "Vision Analysis + Synthesis",
      detail:
          "The vision model inspects the imagery, searches candidates, grounds the target, and writes the final answer.",
      status: "pending",
    },
    {
      id: "confidence",
      label: "Confidence & Provenance",
      detail:
          `Prior ${Math.round(
              confidence.overall * 100,
          )}% · ${confidence.caveats.length} caveat(s)`,
      status: "done",
      meta: [
        {
          label: "prior",
          value: `${Math.round(
              confidence.overall * 100,
          )}%`,
        },
      ],
    },
  ]

  const result: AnalyzeResult = {
    ok: true,
    provider:
    classification.provider,
    intent,
    intentLabel:
        INTENT_LABELS[intent],
    intentRationale:
    classification.rationale,
    routedSpecialist:
    specialist.name,
    queryPlan:
    classification.plan,
    validation: {
      ok: true,
      normalizedQuery:
      validation.normalizedQuery,
      flags:
      validation.flags,
    },
    citations,
    confidence,
    provenance:
    scene.provenance,
    trace,
    offlineAnswer,
  }

  return NextResponse.json(
      result,
  )
}
