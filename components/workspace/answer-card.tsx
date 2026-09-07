"use client"

import { motion } from "motion/react"
import { useSatStore } from "@/lib/store"
import { SPECIALISTS } from "@/lib/registry"
import {
  AlertTriangle,
  Quote,
  MapPin,
} from "lucide-react"

function renderInline(
    text: string,
    keyPrefix: string,
) {
  const parts = text
      .split(
          /(\*\*[^*]+\*\*|\*[^*]+\*)/g,
      )
      .filter(Boolean)

  return parts.map(
      (part, index) => {
        if (
            part.startsWith("**") &&
            part.endsWith("**")
        ) {
          return (
              <strong
                  key={`${keyPrefix}-${index}`}
                  className="font-semibold text-foreground"
              >
                {part.slice(2, -2)}
              </strong>
          )
        }

        if (
            part.startsWith("*") &&
            part.endsWith("*")
        ) {
          return (
              <em
                  key={`${keyPrefix}-${index}`}
                  className="text-muted"
              >
                {part.slice(1, -1)}
              </em>
          )
        }

        return (
            <span
                key={`${keyPrefix}-${index}`}
            >
          {part}
        </span>
        )
      },
  )
}

function AnswerBody({
                      answer,
                    }: {
  answer: string
}) {
  const lines =
      answer.split("\n")

  return (
      <div className="space-y-1.5 text-sm leading-relaxed text-foreground/90">
        {lines.map(
            (line, index) => {
              const text =
                  line.trim()

              if (!text) {
                return (
                    <div
                        key={index}
                        className="h-1"
                    />
                )
              }

              if (
                  text.startsWith("•") ||
                  text.startsWith("-")
              ) {
                return (
                    <div
                        key={index}
                        className="flex gap-2"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-cyan" />
                      <p>
                        {renderInline(
                            text.replace(
                                /^[•-]\s*/,
                                "",
                            ),
                            `l${index}`,
                        )}
                      </p>
                    </div>
                )
              }

              return (
                  <p key={index}>
                    {renderInline(
                        text,
                        `l${index}`,
                    )}
                  </p>
              )
            },
        )}
      </div>
  )
}

function ConfidenceMeter({
                           value,
                         }: {
  value: number
}) {
  const pct = Math.round(
      value * 100,
  )

  const color =
      pct >= 75
          ? "#34d399"
          : pct >= 55
              ? "#fbbf24"
              : "#f87171"

  return (
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
          <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor:
                color,
              }}
              initial={{
                width: 0,
              }}
              animate={{
                width: `${pct}%`,
              }}
              transition={{
                duration: 0.6,
                ease: "easeOut",
              }}
          />
        </div>

        <span
            className="font-mono text-xs font-semibold"
            style={{
              color,
            }}
        >
        {pct}%
      </span>
      </div>
  )
}

export function AnswerCard() {
  const status =
      useSatStore(
          (s) => s.status,
      )
  const answer =
      useSatStore(
          (s) => s.answer,
      )
  const confidence =
      useSatStore(
          (s) => s.confidence,
      )
  const citations =
      useSatStore(
          (s) => s.citations,
      )
  const intent =
      useSatStore(
          (s) => s.intent,
      )
  const error =
      useSatStore(
          (s) => s.error,
      )
  const activeCitationId =
      useSatStore(
          (s) =>
              s.activeCitationId,
      )
  const setActiveCitation =
      useSatStore(
          (s) =>
              s.setActiveCitation,
      )

  const accent = intent
      ? SPECIALISTS[intent]
          .accent
      : "#22d3ee"

  if (
      status === "error"
  ) {
    return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Analysis unavailable
          </div>
          <p className="mt-1 text-xs text-muted">
            {error}
          </p>
        </div>
    )
  }

  if (
      status === "idle" &&
      !answer
  ) {
    return (
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm font-medium text-foreground">
            Pick a scene and ask a question
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            The system parses the request,
            inspects the actual imagery,
            searches and ranks visual
            candidates, then returns grounded
            overlays with supporting evidence.
          </p>
        </div>
    )
  }

  return (
      <div className="space-y-3">
        <div className="glass-strong rounded-2xl p-4">
          <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted-2">
            Grounded answer
          </span>

            {confidence && (
                <ConfidenceMeter
                    value={
                      confidence.overall
                    }
                />
            )}
          </div>

          {answer ? (
              <AnswerBody
                  answer={answer}
              />
          ) : (
              <div className="space-y-2">
                <div className="shimmer h-3 w-11/12 rounded" />
                <div className="shimmer h-3 w-4/5 rounded" />
                <div className="shimmer h-3 w-3/4 rounded" />
              </div>
          )}
        </div>

        {citations.length > 0 && (
            <div className="glass rounded-2xl p-3">
              <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">
                <Quote className="h-3 w-3" />
                Grounding & evidence ·{" "}
                {citations.length} citation
                {citations.length > 1
                    ? "s"
                    : ""}
              </p>

              <ul className="space-y-1">
                {citations.map(
                    (citation) => {
                      const active =
                          activeCitationId ===
                          citation.id

                      const hasSpatial =
                          Boolean(
                              citation.bbox,
                          ) ||
                          Boolean(
                              citation.overlay,
                          )

                      const isVision =
                          citation.source ===
                          "vision"

                      return (
                          <li
                              key={
                                citation.id
                              }
                          >
                            <button
                                type="button"
                                onClick={() =>
                                    hasSpatial &&
                                    setActiveCitation(
                                        active
                                            ? null
                                            : citation.id,
                                    )
                                }
                                className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                                    hasSpatial
                                        ? "cursor-pointer hover:bg-white/[0.04]"
                                        : "cursor-default"
                                } ${
                                    active
                                        ? "bg-white/[0.06]"
                                        : ""
                                }`}
                                style={
                                  active
                                      ? {
                                        boxShadow: `inset 0 0 0 1px ${accent}66`,
                                      }
                                      : undefined
                                }
                            >
                      <span
                          className="mt-0.5 inline-flex h-4 shrink-0 items-center rounded font-mono text-[9px] uppercase"
                          style={{
                            color:
                                hasSpatial
                                    ? accent
                                    : "var(--muted-2)",
                          }}
                      >
                        {hasSpatial ? (
                            <MapPin className="h-3 w-3" />
                        ) : (
                            "·"
                        )}
                      </span>

                              <span className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-foreground">
                          {citation.label}
                        </span>

                                {isVision && (
                                    <span className="ml-1 rounded bg-brand-cyan/10 px-1 py-0.5 font-mono text-[8px] uppercase text-brand-cyan">
                            AI visual
                          </span>
                                )}

                                <span className="mt-0.5 block text-[11px] leading-snug text-muted">
                          {citation.detail}
                        </span>
                      </span>
                            </button>
                          </li>
                      )
                    },
                )}
              </ul>
            </div>
        )}

        {confidence && (
            <div className="glass rounded-2xl p-3">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-2">
                Confidence breakdown
              </p>

              <div className="space-y-1.5">
                {confidence.components.map(
                    (component) => (
                        <div
                            key={
                              component.label
                            }
                            className="flex items-center gap-2"
                        >
                  <span className="w-28 shrink-0 text-[11px] text-muted">
                    {
                      component.label
                    }
                  </span>

                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                            <div
                                className="h-full rounded-full bg-brand-cyan/70"
                                style={{
                                  width: `${component.value * 100}%`,
                                }}
                            />
                          </div>

                          <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted-2">
                    {Math.round(
                        component.value *
                        100,
                    )}
                  </span>
                        </div>
                    ),
                )}
              </div>

              {confidence.caveats
                  .length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-white/10 pt-2.5">
                    {confidence.caveats.map(
                        (caveat, index) => (
                            <li
                                key={index}
                                className="flex gap-1.5 text-[11px] leading-snug text-warning/90"
                            >
                              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                              {caveat}
                            </li>
                        ),
                    )}
                  </ul>
              )}
            </div>
        )}
      </div>
  )
}
