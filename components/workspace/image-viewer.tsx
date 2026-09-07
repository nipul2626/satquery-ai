"use client"

import Image from "next/image"
import {
    useEffect,
    useRef,
    useState,
    useCallback,
} from "react"
import { motion } from "motion/react"
import { useSatStore } from "@/lib/store"
import { SPECIALISTS } from "@/lib/registry"
import type {
    Citation,
    Scene,
} from "@/lib/types"
import {
    ShieldCheck,
    GitCompareArrows,
} from "lucide-react"

function BoundingOverlay({
                             citations,
                             accent,
                             activeId,
                         }: {
    citations: Citation[]
    accent: string
    activeId: string | null
}) {
    const spatial =
        citations.filter(
            (citation) =>
                citation.bbox ||
                citation.overlay,
        )

    if (!spatial.length) {
        return null
    }

    return (
        <svg
            className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            {spatial.map(
                (citation, index) => {
                    const bbox =
                        citation.bbox
                    const geometry =
                        citation.overlay
                    const active =
                        activeId ===
                        citation.id

                    if (
                        geometry?.type ===
                        "point"
                    ) {
                        const point =
                            geometry.points[0]

                        return (
                            <g
                                key={citation.id}
                            >
                                <motion.circle
                                    cx={point.x * 100}
                                    cy={point.y * 100}
                                    r={
                                        active
                                            ? 3
                                            : 2
                                    }
                                    fill={accent}
                                    fillOpacity={
                                        active
                                            ? 0.18
                                            : 0.08
                                    }
                                    stroke={accent}
                                    strokeWidth={
                                        active
                                            ? 1.2
                                            : 0.8
                                    }
                                    vectorEffect="non-scaling-stroke"
                                    initial={{
                                        opacity: 0,
                                        scale: 0.4,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1,
                                    }}
                                    transition={{
                                        duration: 0.35,
                                        delay:
                                            index * 0.06,
                                    }}
                                    style={{
                                        transformBox:
                                            "fill-box",
                                        transformOrigin:
                                            "center",
                                        filter:
                                            active
                                                ? `drop-shadow(0 0 6px ${accent})`
                                                : `drop-shadow(0 0 2px ${accent})`,
                                    }}
                                />
                            </g>
                        )
                    }

                    if (
                        geometry?.type ===
                        "line" ||
                        geometry?.type ===
                        "polygon"
                    ) {
                        const points =
                            geometry.points
                                .map(
                                    (point) =>
                                        `${point.x * 100},${point.y * 100}`,
                                )
                                .join(" ")

                        if (
                            geometry.type ===
                            "line"
                        ) {
                            return (
                                <g
                                    key={
                                        citation.id
                                    }
                                >
                                    <motion.polyline
                                        points={points}
                                        fill="none"
                                        stroke={accent}
                                        strokeWidth={
                                            active
                                                ? 3.4
                                                : 2
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                        opacity={
                                            active
                                                ? 0.24
                                                : 0.1
                                        }
                                        style={{
                                            filter: `blur(${active ? 3 : 1.5}px)`,
                                        }}
                                        initial={{
                                            pathLength: 0,
                                        }}
                                        animate={{
                                            pathLength: 1,
                                        }}
                                        transition={{
                                            duration: 0.8,
                                            delay:
                                                index * 0.08,
                                            ease: [
                                                0.65,
                                                0,
                                                0.35,
                                                1,
                                            ],
                                        }}
                                    />

                                    <motion.polyline
                                        points={points}
                                        fill="none"
                                        stroke={accent}
                                        strokeWidth={
                                            active
                                                ? (geometry.strokeWidth ??
                                                    1.8) *
                                                1.35
                                                : geometry.strokeWidth ??
                                                1.8
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        vectorEffect="non-scaling-stroke"
                                        opacity={
                                            active
                                                ? 1
                                                : 0.9
                                        }
                                        initial={{
                                            pathLength: 0,
                                            opacity: 0,
                                        }}
                                        animate={{
                                            pathLength: 1,
                                            opacity:
                                                active
                                                    ? 1
                                                    : 0.9,
                                        }}
                                        transition={{
                                            duration: 0.9,
                                            delay:
                                                index * 0.08,
                                            ease: [
                                                0.65,
                                                0,
                                                0.35,
                                                1,
                                            ],
                                        }}
                                        style={{
                                            filter:
                                                active
                                                    ? `drop-shadow(0 0 5px ${accent})`
                                                    : `drop-shadow(0 0 2px ${accent})`,
                                        }}
                                    />

                                    {geometry.points.length >
                                        1 && (
                                            <>
                                                <circle
                                                    cx={
                                                        geometry
                                                            .points[0]
                                                            .x * 100
                                                    }
                                                    cy={
                                                        geometry
                                                            .points[0]
                                                            .y * 100
                                                    }
                                                    r={
                                                        active
                                                            ? 1.2
                                                            : 0.8
                                                    }
                                                    fill={accent}
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                                <circle
                                                    cx={
                                                        geometry
                                                            .points[
                                                        geometry
                                                            .points
                                                            .length -
                                                        1
                                                            ].x *
                                                        100
                                                    }
                                                    cy={
                                                        geometry
                                                            .points[
                                                        geometry
                                                            .points
                                                            .length -
                                                        1
                                                            ].y *
                                                        100
                                                    }
                                                    r={
                                                        active
                                                            ? 1.2
                                                            : 0.8
                                                    }
                                                    fill={accent}
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            </>
                                        )}
                                </g>
                            )
                        }

                        return (
                            <motion.polygon
                                key={citation.id}
                                points={points}
                                fill={accent}
                                fillOpacity={
                                    active
                                        ? 0.16
                                        : 0.08
                                }
                                stroke={accent}
                                strokeWidth={
                                    active ? 1 : 0.6
                                }
                                vectorEffect="non-scaling-stroke"
                                initial={{
                                    opacity: 0,
                                }}
                                animate={{
                                    opacity: 1,
                                }}
                                transition={{
                                    duration: 0.5,
                                    delay:
                                        index * 0.08,
                                }}
                                style={{
                                    filter:
                                        active
                                            ? `drop-shadow(0 0 6px ${accent})`
                                            : "none",
                                }}
                            />
                        )
                    }

                    if (!bbox) {
                        return null
                    }

                    return (
                        <motion.rect
                            key={citation.id}
                            x={bbox.x * 100}
                            y={bbox.y * 100}
                            width={bbox.w * 100}
                            height={bbox.h * 100}
                            fill={
                                active
                                    ? accent
                                    : "transparent"
                            }
                            fillOpacity={
                                active ? 0.14 : 0
                            }
                            stroke={accent}
                            strokeWidth={
                                active ? 0.9 : 0.55
                            }
                            vectorEffect="non-scaling-stroke"
                            rx={0.8}
                            initial={{
                                pathLength: 0,
                                opacity: 0,
                            }}
                            animate={{
                                pathLength: 1,
                                opacity: 1,
                            }}
                            transition={{
                                duration: 0.7,
                                delay:
                                    index * 0.1,
                                ease: [
                                    0.65,
                                    0,
                                    0.35,
                                    1,
                                ],
                            }}
                            style={{
                                filter:
                                    active
                                        ? `drop-shadow(0 0 6px ${accent})`
                                        : "none",
                            }}
                        />
                    )
                },
            )}
        </svg>
    )
}

function OverlayLabels({
                           citations,
                           accent,
                           activeId,
                           onPick,
                       }: {
    citations: Citation[]
    accent: string
    activeId: string | null
    onPick: (
        id: string | null,
    ) => void
}) {
    const visible =
        citations.filter(
            (citation) =>
                citation.bbox ||
                citation.overlay,
        )

    return (
        <div className="pointer-events-none absolute inset-0 z-30">
            {visible.map(
                (citation) => {
                    const active =
                        activeId ===
                        citation.id

                    let labelX =
                        citation.bbox?.x ??
                        0
                    let labelY =
                        citation.bbox?.y ??
                        0

                    if (
                        citation.overlay?.points
                            .length
                    ) {
                        const points =
                            citation.overlay
                                .points

                        if (
                            citation.overlay
                                .type ===
                            "point"
                        ) {
                            labelX =
                                points[0].x
                            labelY =
                                points[0].y
                        } else if (
                            citation.overlay
                                .type ===
                            "line"
                        ) {
                            const middle =
                                points[
                                    Math.floor(
                                        points.length /
                                        2,
                                    )
                                    ]

                            labelX = Math.max(
                                0.02,
                                Math.min(
                                    0.78,
                                    middle.x -
                                    0.06,
                                ),
                            )
                            labelY = Math.max(
                                0.05,
                                middle.y -
                                0.06,
                            )
                        } else {
                            labelX = points
                                .reduce(
                                    (sum, point) =>
                                        sum + point.x,
                                    0,
                                ) / points.length
                            labelY = points
                                .reduce(
                                    (sum, point) =>
                                        sum + point.y,
                                    0,
                                ) / points.length
                        }
                    }

                    const leaderTarget =
                        citation.overlay
                            ?.type === "line"
                            ? citation.overlay
                                .points[
                                Math.floor(
                                    citation.overlay
                                        .points.length /
                                    2,
                                )
                                ]
                            : null

                    return (
                        <div
                            key={citation.id}
                        >
                            {leaderTarget && (
                                <svg
                                    className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                                    viewBox="0 0 100 100"
                                    preserveAspectRatio="none"
                                >
                                    <line
                                        x1={
                                            (labelX +
                                                0.075) *
                                            100
                                        }
                                        y1={
                                            (labelY +
                                                0.025) *
                                            100
                                        }
                                        x2={
                                            leaderTarget.x *
                                            100
                                        }
                                        y2={
                                            leaderTarget.y *
                                            100
                                        }
                                        stroke={accent}
                                        strokeWidth={
                                            active
                                                ? 1.1
                                                : 0.7
                                        }
                                        strokeDasharray={
                                            active
                                                ? "0"
                                                : "2 1.5"
                                        }
                                        vectorEffect="non-scaling-stroke"
                                        opacity={
                                            active
                                                ? 1
                                                : 0.8
                                        }
                                    />
                                </svg>
                            )}

                            <button
                                type="button"
                                onClick={() =>
                                    onPick(
                                        active
                                            ? null
                                            : citation.id,
                                    )
                                }
                                className="pointer-events-auto absolute rounded-md px-2 py-1 font-mono text-[10px] font-semibold leading-none transition-all duration-200"
                                style={{
                                    left: `${labelX * 100}%`,
                                    top: `${labelY * 100}%`,
                                    background:
                                        active
                                            ? accent
                                            : "rgba(5,5,15,0.86)",
                                    color: active
                                        ? "#05050f"
                                        : accent,
                                    border: `1px solid ${accent}`,
                                    boxShadow:
                                        active
                                            ? `0 0 14px ${accent}99`
                                            : `0 0 7px ${accent}33`,
                                    transform:
                                        citation.overlay
                                            ?.type ===
                                        "point"
                                            ? "translate(-50%, -115%)"
                                            : "translateY(-100%)",
                                }}
                            >
                                {citation.label}
                                {citation.source ===
                                    "vision" && (
                                        <span className="ml-1 opacity-60">
                    AI
                  </span>
                                    )}
                            </button>
                        </div>
                    )
                },
            )}
        </div>
    )
}

function SwipeCompare({
                          before,
                          after,
                          alt,
                      }: {
    before: string
    after: string
    alt: string
}) {
    const [pct, setPct] =
        useState(50)
    const ref =
        useRef<HTMLDivElement>(
            null,
        )
    const dragging =
        useRef(false)

    const setFromClientX =
        useCallback(
            (clientX: number) => {
                const el =
                    ref.current

                if (!el) return

                const rect =
                    el.getBoundingClientRect()

                const p =
                    ((clientX -
                            rect.left) /
                        rect.width) *
                    100

                setPct(
                    Math.max(
                        0,
                        Math.min(100, p),
                    ),
                )
            },
            [],
        )

    useEffect(() => {
        const move = (
            event: PointerEvent,
        ) => {
            if (
                dragging.current
            ) {
                setFromClientX(
                    event.clientX,
                )
            }
        }

        const up = () => {
            dragging.current = false
        }

        window.addEventListener(
            "pointermove",
            move,
        )
        window.addEventListener(
            "pointerup",
            up,
        )

        return () => {
            window.removeEventListener(
                "pointermove",
                move,
            )
            window.removeEventListener(
                "pointerup",
                up,
            )
        }
    }, [setFromClientX])

    return (
        <div
            ref={ref}
            className="relative h-full w-full select-none overflow-hidden rounded-xl"
            onPointerDown={(
                event,
            ) => {
                dragging.current =
                    true
                setFromClientX(
                    event.clientX,
                )
            }}
        >
            <Image
                src={
                    before ||
                    "/placeholder.svg"
                }
                alt={`${alt} — before`}
                fill
                sizes="60vw"
                className="object-cover"
                priority
            />

            <span className="absolute left-2 top-2 z-20 rounded-md bg-[#05050f]/75 px-2 py-0.5 font-mono text-[10px] text-brand-cyan">
        T0 · before
      </span>

            <div
                className="absolute inset-0"
                style={{
                    clipPath: `inset(0 0 0 ${pct}%)`,
                }}
            >
                <Image
                    src={
                        after ||
                        "/placeholder.svg"
                    }
                    alt={`${alt} — after`}
                    fill
                    sizes="60vw"
                    className="object-cover"
                />

                <span className="absolute right-2 top-2 z-20 rounded-md bg-[#05050f]/75 px-2 py-0.5 font-mono text-[10px] text-brand-magenta">
          T1 · after
        </span>
            </div>

            <div
                className="absolute inset-y-0 z-30 w-0.5 bg-white/80"
                style={{
                    left: `${pct}%`,
                }}
            >
                <div className="brand-gradient absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg">
                    <GitCompareArrows className="h-4 w-4 text-[#05050f]" />
                </div>
            </div>
        </div>
    )
}

export function ImageViewer() {
    const scene =
        useSatStore(
            (s) => s.scene,
        )
    const status =
        useSatStore(
            (s) => s.status,
        )
    const citations =
        useSatStore(
            (s) => s.citations,
        )
    const intent =
        useSatStore(
            (s) => s.intent,
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

    const [pairView, setPairView] =
        useState<
            "optical" | "sar"
        >("optical")

    const accent = intent
        ? SPECIALISTS[intent]
            .accent
        : "#22d3ee"

    const showOverlays =
        status === "done" &&
        citations.some(
            (citation) =>
                citation.bbox ||
                citation.overlay,
        )

    const visibleCitations =
        citations.filter(
            (citation) => {
                if (
                    !citation.bbox &&
                    !citation.overlay
                ) {
                    return false
                }

                if (
                    scene.mode ===
                    "pair"
                ) {
                    const target =
                        citation.target

                    return (
                        target === undefined ||
                        target === "both" ||
                        target === pairView
                    )
                }

                if (
                    scene.mode ===
                    "bitemporal"
                ) {
                    return (
                        citation.target ===
                        "after" ||
                        citation.target ===
                        "both" ||
                        citation.target ===
                        undefined
                    )
                }

                return true
            },
        )

    return (
        <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-2">
                    Scene viewer
                </h2>

                <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px]"
                    style={{
                        borderColor:
                            "rgba(52,211,153,0.3)",
                        color: "#34d399",
                    }}
                >
          <ShieldCheck className="h-3 w-3" />
          Verified Demo Dataset
        </span>
            </div>

            <div className="glass-strong relative flex-1 overflow-hidden rounded-2xl p-2.5">
                <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-xl bg-[#02020a]">
                    {scene.mode ===
                    "bitemporal" ? (
                        <SwipeCompare
                            before={
                                scene.images
                                    .before ?? ""
                            }
                            after={
                                scene.images.after ??
                                ""
                            }
                            alt={
                                scene.title
                            }
                        />
                    ) : (
                        <Image
                            src={
                                (
                                    scene.mode ===
                                    "pair"
                                        ? pairView ===
                                        "sar"
                                            ? scene.images
                                                .sar
                                            : scene.images
                                                .optical
                                        : scene.images
                                            .optical
                                ) ||
                                "/placeholder.svg"
                            }
                            alt={scene.title}
                            fill
                            sizes="60vw"
                            className="object-cover"
                            priority
                        />
                    )}

                    {showOverlays && (
                        <>
                            <BoundingOverlay
                                citations={
                                    visibleCitations
                                }
                                accent={accent}
                                activeId={
                                    activeCitationId
                                }
                            />

                            <OverlayLabels
                                citations={
                                    visibleCitations
                                }
                                accent={accent}
                                activeId={
                                    activeCitationId
                                }
                                onPick={
                                    setActiveCitation
                                }
                            />
                        </>
                    )}
                </div>

                {scene.mode ===
                    "pair" && (
                        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-[#05050f]/80 p-1 backdrop-blur">
                            {(
                                [
                                    "optical",
                                    "sar",
                                ] as const
                            ).map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                        setPairView(
                                            value,
                                        )
                                    }
                                    aria-pressed={
                                        pairView ===
                                        value
                                    }
                                    className={`rounded-full px-3.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                                        pairView ===
                                        value
                                            ? "text-[#05050f]"
                                            : "text-muted hover:text-foreground"
                                    }`}
                                    style={
                                        pairView ===
                                        value
                                            ? {
                                                backgroundColor:
                                                    value ===
                                                    "sar"
                                                        ? "#2dd4bf"
                                                        : "#22d3ee",
                                            }
                                            : undefined
                                    }
                                >
                                    {value ===
                                    "sar"
                                        ? "SAR"
                                        : "Optical"}
                                </button>
                            ))}
                        </div>
                    )}
            </div>

            <p className="mt-2 text-center font-mono text-[10px] text-muted-2">
                {scene.mode ===
                "bitemporal"
                    ? "Drag the handle to compare epochs · overlays mark detected change regions"
                    : scene.mode ===
                    "pair"
                        ? "Toggle optical / SAR · AI and evidence overlays follow the active modality"
                        : "AI-grounded targets appear on the imagery · click a label to focus"}
            </p>
        </div>
    )
}
