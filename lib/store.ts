"use client"

import { create } from "zustand"

import type {
    AnalyzeResult,
    Citation,
    ConfidenceBreakdown,
    Intent,
    Scene,
    SceneMode,
    ProviderId,
    SynthesisResponse,
    TraceStep,
} from "./types"

import { SCENES } from "./scenes"

export type RunStatus =
    | "idle"
    | "validating"
    | "classifying"
    | "retrieving"
    | "synthesizing"
    | "done"
    | "error"

export type QueryRecord = {
    id: string
    query: string
    intent: Intent
    intentLabel: string
    provider: ProviderId
    confidence: ConfidenceBreakdown
    answer: string
    citations: Citation[]
    ts: number
}

type State = {
    scene: Scene
    query: string
    status: RunStatus
    error: string | null

    trace: TraceStep[]

    provider: ProviderId | null

    intent: Intent | null
    intentLabel: string | null
    intentRationale: string | null
    routedSpecialist: string | null

    citations: Citation[]
    confidence: ConfidenceBreakdown | null
    answer: string
    activeCitationId: string | null

    history: QueryRecord[]

    setScene: (scene: Scene) => void
    setMode: (mode: SceneMode) => void
    setQuery: (q: string) => void
    setActiveCitation: (
        id: string | null,
    ) => void
    restoreFromHistory: (
        record: QueryRecord,
    ) => void
    run: (query: string) => Promise<void>
    reset: () => void
}

const INITIAL_TRACE: TraceStep[] = [
    {
        id: "validate",
        label: "Input Validation",
        detail:
            "Normalize and guard the query",
        status: "pending",
    },
    {
        id: "classify",
        label: "Query Understanding",
        detail:
            "Parse the requested visual operation",
        status: "pending",
    },
    {
        id: "route",
        label: "Specialist Routing",
        detail:
            "Resolve capability + tools",
        status: "pending",
    },
    {
        id: "retrieve",
        label: "Evidence Retrieval",
        detail:
            "Retrieve supporting scene evidence",
        status: "pending",
    },
    {
        id: "synthesize",
        label:
            "Vision Analysis + Synthesis",
        detail:
            "Inspect imagery, ground targets, rank candidates, and answer",
        status: "pending",
    },
    {
        id: "confidence",
        label:
            "Confidence & Provenance",
        detail:
            "Score visual support and attach caveats",
        status: "pending",
    },
]

function freshTrace(): TraceStep[] {
    return INITIAL_TRACE.map(
        (step) => ({
            ...step,
        }),
    )
}

const wait = (ms: number) =>
    new Promise((resolve) =>
        setTimeout(resolve, ms),
    )

function mergeConfidence(
    prior: ConfidenceBreakdown,
    visualConfidence: number,
): ConfidenceBreakdown {
    if (
        !Number.isFinite(
            visualConfidence,
        ) ||
        visualConfidence <= 0
    ) {
        return prior
    }

    const overall =
        Math.round(
            Math.max(
                0,
                Math.min(
                    1,
                    prior.overall * 0.35 +
                    visualConfidence * 0.65,
                ),
            ) * 100,
        ) / 100

    return {
        overall,
        components: [
            ...prior.components,
            {
                label: "Visual grounding",
                value:
                    Math.round(
                        visualConfidence *
                        100,
                    ) / 100,
                note:
                    "Vision model confidence in the returned visual findings",
            },
        ],
        caveats:
        prior.caveats,
    }
}

function pickActiveCitation(
    citations: Citation[],
): string | null {
    return (
        citations.find(
            (citation) =>
                citation.role ===
                "target" &&
                (
                    Boolean(
                        citation.bbox,
                    ) ||
                    Boolean(
                        citation.overlay,
                    )
                ),
        )?.id ??
        citations.find(
            (citation) =>
                citation.source ===
                "vision" &&
                (
                    Boolean(
                        citation.bbox,
                    ) ||
                    Boolean(
                        citation.overlay,
                    )
                ),
        )?.id ??
        citations.find(
            (citation) =>
                Boolean(
                    citation.bbox,
                ) ||
                Boolean(
                    citation.overlay,
                ),
        )?.id ??
        null
    )
}

export const useSatStore =
    create<State>(
        (set, get) => ({
            scene: SCENES[0],
            query: "",
            status: "idle",
            error: null,

            trace: freshTrace(),

            provider: null,

            intent: null,
            intentLabel: null,
            intentRationale: null,
            routedSpecialist: null,

            citations: [],
            confidence: null,
            answer: "",
            activeCitationId: null,

            history: [],

            setScene: (scene) =>
                set({
                    scene,
                    status: "idle",
                    trace: freshTrace(),
                    provider: null,
                    intent: null,
                    intentLabel: null,
                    intentRationale: null,
                    routedSpecialist: null,
                    citations: [],
                    confidence: null,
                    answer: "",
                    error: null,
                    activeCitationId: null,
                }),

            setMode: (mode) => {
                const target =
                    SCENES.find(
                        (scene) =>
                            scene.mode === mode,
                    )

                if (
                    target &&
                    target.id !==
                    get().scene.id
                ) {
                    get().setScene(
                        target,
                    )
                }
            },

            setQuery: (q) =>
                set({
                    query: q,
                }),

            setActiveCitation: (id) =>
                set({
                    activeCitationId: id,
                }),

            restoreFromHistory: (
                record,
            ) =>
                set({
                    status: "done",
                    query: record.query,
                    answer: record.answer,
                    citations:
                    record.citations,
                    confidence:
                    record.confidence,
                    intent: record.intent,
                    intentLabel:
                    record.intentLabel,
                    provider:
                    record.provider,
                    activeCitationId:
                        pickActiveCitation(
                            record.citations,
                        ),
                    error: null,
                    trace: freshTrace().map(
                        (step) => ({
                            ...step,
                            status:
                                "done" as const,
                        }),
                    ),
                }),

            reset: () =>
                set({
                    status: "idle",
                    trace: freshTrace(),
                    provider: null,
                    intent: null,
                    intentLabel: null,
                    intentRationale: null,
                    routedSpecialist: null,
                    citations: [],
                    confidence: null,
                    answer: "",
                    error: null,
                    activeCitationId: null,
                }),

            run: async (
                rawQuery,
            ) => {
                const query =
                    rawQuery.trim()

                if (!query) return

                const scene =
                    get().scene

                const patchStep = (
                    id: string,
                    patch: Partial<TraceStep>,
                ) => {
                    set((state) => ({
                        trace:
                            state.trace.map(
                                (step) =>
                                    step.id === id
                                        ? {
                                            ...step,
                                            ...patch,
                                        }
                                        : step,
                            ),
                    }))
                }

                set({
                    status: "validating",
                    error: null,
                    answer: "",
                    citations: [],
                    confidence: null,
                    provider: null,
                    intent: null,
                    intentLabel: null,
                    intentRationale: null,
                    routedSpecialist: null,
                    activeCitationId: null,
                    trace: freshTrace(),
                    query,
                })

                patchStep(
                    "validate",
                    {
                        status: "running",
                    },
                )

                await wait(120)

                set({
                    status: "classifying",
                })

                patchStep(
                    "validate",
                    {
                        status: "done",
                    },
                )

                patchStep(
                    "classify",
                    {
                        status: "running",
                    },
                )

                patchStep(
                    "route",
                    {
                        status: "running",
                    },
                )

                let result:
                    AnalyzeResult

                try {
                    const res =
                        await fetch(
                            "/api/analyze",
                            {
                                method: "POST",
                                headers: {
                                    "content-type":
                                        "application/json",
                                },
                                body: JSON.stringify({
                                    sceneId:
                                    scene.id,
                                    query,
                                }),
                            },
                        )

                    if (!res.ok) {
                        throw new Error(
                            `analyze ${res.status}`,
                        )
                    }

                    result =
                        (await res.json()) as AnalyzeResult
                } catch (err) {
                    console.log(
                        "[satquery] analyze failed:",
                        (
                            err as Error
                        )?.message,
                    )

                    set({
                        status: "error",
                        error:
                            "The analysis service is unavailable. Please try again.",
                    })

                    patchStep(
                        "classify",
                        {
                            status:
                                "skipped",
                        },
                    )

                    patchStep(
                        "route",
                        {
                            status:
                                "skipped",
                        },
                    )

                    return
                }

                const byId =
                    new Map(
                        result.trace.map(
                            (trace) => [
                                trace.id,
                                trace,
                            ],
                        ),
                    )

                const applyMeta = (
                    id: string,
                ) => {
                    const server =
                        byId.get(id)

                    if (!server) return

                    patchStep(
                        id,
                        {
                            detail:
                            server.detail,
                            meta:
                            server.meta,
                            durationMs:
                            server.durationMs,
                        },
                    )
                }

                patchStep(
                    "classify",
                    {
                        status: "done",
                    },
                )
                applyMeta("classify")

                set({
                    intent:
                    result.intent,
                    intentLabel:
                    result.intentLabel,
                    intentRationale:
                    result.intentRationale,
                    routedSpecialist:
                    result.routedSpecialist,
                })

                await wait(100)

                patchStep(
                    "route",
                    {
                        status: "done",
                    },
                )
                applyMeta("route")

                await wait(100)

                set({
                    status:
                        "retrieving",
                })

                patchStep(
                    "retrieve",
                    {
                        status: "running",
                    },
                )

                await wait(140)

                set({
                    citations:
                    result.citations,
                    activeCitationId:
                        pickActiveCitation(
                            result.citations,
                        ),
                })

                patchStep(
                    "retrieve",
                    {
                        status: "done",
                    },
                )
                applyMeta("retrieve")

                set({
                    status:
                        "synthesizing",
                })

                patchStep(
                    "synthesize",
                    {
                        status: "running",
                    },
                )

                let answer = ""
                let finalCitations =
                    result.citations
                let finalConfidence =
                    result.confidence
                let finalProvider:
                    ProviderId =
                    "offline"

                try {
                    const res =
                        await fetch(
                            "/api/synthesize",
                            {
                                method: "POST",
                                headers: {
                                    "content-type":
                                        "application/json",
                                },
                                body: JSON.stringify({
                                    sceneId:
                                    scene.id,
                                    query,
                                    intent:
                                    result.intent,
                                }),
                            },
                        )

                    const providerHeader =
                        res.headers.get(
                            "x-satquery-provider",
                        ) as
                            | ProviderId
                            | null

                    if (
                        providerHeader
                    ) {
                        finalProvider =
                            providerHeader
                        set({
                            provider:
                            providerHeader,
                        })
                    }

                    if (!res.ok) {
                        throw new Error(
                            `synthesize ${res.status}`,
                        )
                    }

                    const payload =
                        (await res.json()) as SynthesisResponse

                    answer =
                        payload.answer?.trim() ??
                        ""

                    if (
                        payload.citations
                    ) {
                        finalCitations =
                            payload.citations
                    }

                    if (
                        payload.visualAnalysis
                    ) {
                        finalConfidence =
                            mergeConfidence(
                                result.confidence,
                                payload.confidence,
                            )

                        const findingCount =
                            payload.visualAnalysis
                                .findings.length

                        const selected =
                            payload.visualAnalysis
                                .selectedFindingId
                                ? "target grounded"
                                : "visual answer"

                        patchStep(
                            "synthesize",
                            {
                                detail:
                                    "Vision model inspected the imagery and returned structured visual reasoning.",
                                meta: [
                                    {
                                        label:
                                            "provider",
                                        value:
                                        finalProvider,
                                    },
                                    {
                                        label:
                                            "findings",
                                        value:
                                            String(
                                                findingCount,
                                            ),
                                    },
                                    {
                                        label:
                                            "grounding",
                                        value:
                                        selected,
                                    },
                                    {
                                        label:
                                            "confidence",
                                        value:
                                            `${Math.round(
                                                payload.confidence *
                                                100,
                                            )}%`,
                                    },
                                ],
                            },
                        )
                    }

                    if (!answer) {
                        throw new Error(
                            "empty synthesis response",
                        )
                    }
                } catch (err) {
                    console.log(
                        "[satquery] AI synthesis failed:",
                        (
                            err as Error
                        )?.message,
                    )

                    answer =
                        result.offlineAnswer

                    finalCitations =
                        result.citations

                    finalConfidence =
                        result.confidence

                    finalProvider =
                        "offline"

                    set({
                        provider:
                            "offline",
                    })
                }

                set({
                    answer,
                    citations:
                    finalCitations,
                    confidence:
                    finalConfidence,
                    provider:
                    finalProvider,
                    activeCitationId:
                        pickActiveCitation(
                            finalCitations,
                        ),
                })

                patchStep(
                    "synthesize",
                    {
                        status: "done",
                    },
                )

                patchStep(
                    "confidence",
                    {
                        status: "running",
                    },
                )

                await wait(120)

                patchStep(
                    "confidence",
                    {
                        status: "done",
                        detail:
                            `Overall ${Math.round(
                                finalConfidence.overall *
                                100,
                            )}% · ${finalConfidence.caveats.length} caveat(s)`,
                        meta: [
                            {
                                label: "overall",
                                value: `${Math.round(
                                    finalConfidence.overall *
                                    100,
                                )}%`,
                            },
                        ],
                    },
                )

                const record: QueryRecord =
                    {
                        id:
                            crypto.randomUUID(),
                        query,
                        intent:
                        result.intent,
                        intentLabel:
                        result.intentLabel,
                        provider:
                        finalProvider,
                        confidence:
                        finalConfidence,
                        answer,
                        citations:
                        finalCitations,
                        ts: Date.now(),
                    }

                set((state) => ({
                    status: "done",
                    history: [
                        record,
                        ...state.history,
                    ].slice(0, 12),
                }))
            },
        }),
    )
