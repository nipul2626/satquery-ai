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
  setActiveCitation: (id: string | null) => void
  restoreFromHistory: (record: QueryRecord) => void
  run: (query: string) => Promise<void>
  reset: () => void
}

const INITIAL_TRACE: TraceStep[] = [
  {
    id: "validate",
    label: "Input Validation",
    detail: "Normalize and guard the query",
    status: "pending",
  },
  {
    id: "classify",
    label: "Intent Classification",
    detail: "Local router selects the specialist",
    status: "pending",
  },
  {
    id: "route",
    label: "Specialist Routing",
    detail: "Resolve capability + tools",
    status: "pending",
  },
  {
    id: "retrieve",
    label: "Evidence Retrieval",
    detail: "Ground against scene store",
    status: "pending",
  },
  {
    id: "synthesize",
    label: "Grounded Synthesis",
    detail: "Generate answer using vision model",
    status: "pending",
  },
  {
    id: "confidence",
    label: "Confidence & Provenance",
    detail: "Score and attach sources",
    status: "pending",
  },
]

function freshTrace(): TraceStep[] {
  return INITIAL_TRACE.map((step) => ({
    ...step,
  }))
}

const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

export const useSatStore = create<State>(
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

      // -----------------------------------------------------------------------
      // SCENE
      // -----------------------------------------------------------------------

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
        const target = SCENES.find(
            (scene) => scene.mode === mode,
        )

        if (
            target &&
            target.id !== get().scene.id
        ) {
          get().setScene(target)
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

      // -----------------------------------------------------------------------
      // HISTORY
      // -----------------------------------------------------------------------

      restoreFromHistory: (record) =>
          set({
            status: "done",
            query: record.query,
            answer: record.answer,
            citations: record.citations,
            confidence: record.confidence,
            intent: record.intent,
            intentLabel: record.intentLabel,
            provider: record.provider,
            activeCitationId: null,
            error: null,

            trace: freshTrace().map(
                (step) => ({
                  ...step,
                  status: "done" as const,
                }),
            ),
          }),

      // -----------------------------------------------------------------------
      // RESET
      // -----------------------------------------------------------------------

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

      // -----------------------------------------------------------------------
      // RUN
      // -----------------------------------------------------------------------

      run: async (rawQuery) => {
        const query = rawQuery.trim()

        if (!query) return

        const scene = get().scene

        const patchStep = (
            id: string,
            patch: Partial<TraceStep>,
        ) => {
          set((state) => ({
            trace: state.trace.map(
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

        // ---------------------------------------------------------------------
        // RESET CURRENT RUN
        // ---------------------------------------------------------------------

        set({
          status: "validating",
          error: null,

          answer: "",
          citations: [],
          confidence: null,

          /**
           * Provider is deliberately empty here.
           *
           * Local intent routing is NOT the final provider.
           */
          provider: null,

          intent: null,
          activeCitationId: null,

          trace: freshTrace(),
          query,
        })

        // ---------------------------------------------------------------------
        // 1. VALIDATION
        // ---------------------------------------------------------------------

        patchStep("validate", {
          status: "running",
        })

        await wait(260)

        // ---------------------------------------------------------------------
        // 2. ANALYSIS
        // ---------------------------------------------------------------------

        set({
          status: "classifying",
        })

        patchStep("validate", {
          status: "done",
        })

        patchStep("classify", {
          status: "running",
        })

        patchStep("route", {
          status: "running",
        })

        let result: AnalyzeResult

        try {
          const res = await fetch(
              "/api/analyze",
              {
                method: "POST",
                headers: {
                  "content-type":
                      "application/json",
                },
                body: JSON.stringify({
                  sceneId: scene.id,
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
              (err as Error)?.message,
          )

          set({
            status: "error",
            error:
                "The analysis service is unavailable. Please try again.",
          })

          patchStep("classify", {
            status: "skipped",
          })

          patchStep("route", {
            status: "skipped",
          })

          return
        }

        // ---------------------------------------------------------------------
        // APPLY SERVER TRACE
        // ---------------------------------------------------------------------

        const byId = new Map(
            result.trace.map((trace) => [
              trace.id,
              trace,
            ]),
        )

        const applyMeta = (id: string) => {
          const server = byId.get(id)

          if (server) {
            patchStep(id, {
              detail: server.detail,
              meta: server.meta,
              durationMs:
              server.durationMs,
            })
          }
        }

        // ---------------------------------------------------------------------
        // INTENT
        // ---------------------------------------------------------------------

        patchStep("classify", {
          status: "done",
        })

        applyMeta("classify")

        /**
         * Do NOT set provider here.
         *
         * result.provider is "offline" because routing is local.
         */
        set({
          intent: result.intent,
          intentLabel: result.intentLabel,
          intentRationale:
          result.intentRationale,
          routedSpecialist:
          result.routedSpecialist,
        })

        await wait(160)

        // ---------------------------------------------------------------------
        // SPECIALIST ROUTING
        // ---------------------------------------------------------------------

        patchStep("route", {
          status: "done",
        })

        applyMeta("route")

        await wait(140)

        // ---------------------------------------------------------------------
        // 3. RETRIEVAL
        // ---------------------------------------------------------------------

        set({
          status: "retrieving",
        })

        patchStep("retrieve", {
          status: "running",
        })

        await wait(220)

        set({
          citations: result.citations,

          /**
           * Automatically focus the first spatial citation.
           *
           * Useful for grounding questions such as:
           * "Where is the bridge?"
           */
          activeCitationId:
              result.citations.find(
                  (citation) =>
                      Boolean(citation.bbox) ||
                      Boolean(
                          (
                              citation as Citation & {
                                overlay?: unknown
                              }
                          ).overlay,
                      ),
              )?.id ?? null,
        })

        patchStep("retrieve", {
          status: "done",
        })

        applyMeta("retrieve")

        // ---------------------------------------------------------------------
        // 4. ACTUAL AI SYNTHESIS
        // ---------------------------------------------------------------------

        set({
          status: "synthesizing",
        })

        patchStep("synthesize", {
          status: "running",
        })

        let answer = ""

        try {
          const res = await fetch(
              "/api/synthesize",
              {
                method: "POST",
                headers: {
                  "content-type":
                      "application/json",
                },
                body: JSON.stringify({
                  sceneId: scene.id,
                  query,
                  intent: result.intent,
                }),
              },
          )

          /**
           * This is the ACTUAL provider that generated
           * the answer.
           */
          const synthesisProvider =
              res.headers.get(
                  "x-satquery-provider",
              ) as ProviderId | null

          if (synthesisProvider) {
            set({
              provider:
              synthesisProvider,
            })
          }

          if (!res.ok) {
            throw new Error(
                `synthesize ${res.status}`,
            )
          }

          answer = await res.text()

          if (!answer.trim()) {
            throw new Error(
                "empty synthesis response",
            )
          }

          set({
            answer,
          })
        } catch (err) {
          console.log(
              "[satquery] AI synthesis failed:",
              (err as Error)?.message,
          )

          /**
           * Only now do we use the deterministic fallback.
           */
          answer = result.offlineAnswer

          set({
            answer,
            provider: "offline",
          })
        }

        patchStep("synthesize", {
          status: "done",
        })

        // ---------------------------------------------------------------------
        // 5. CONFIDENCE
        // ---------------------------------------------------------------------

        patchStep("confidence", {
          status: "running",
        })

        await wait(220)

        set({
          confidence:
          result.confidence,
        })

        patchStep("confidence", {
          status: "done",
        })

        applyMeta("confidence")

        // ---------------------------------------------------------------------
        // HISTORY
        // ---------------------------------------------------------------------

        const finalProvider =
            get().provider ?? "offline"

        const record: QueryRecord = {
          id: crypto.randomUUID(),
          query,
          intent: result.intent,
          intentLabel:
          result.intentLabel,
          provider: finalProvider,
          confidence:
          result.confidence,
          answer,
          citations:
          result.citations,
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