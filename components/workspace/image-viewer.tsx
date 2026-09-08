"use client"

import Image from "next/image"
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { motion } from "motion/react"
import { useSatStore } from "@/lib/store"
import { SPECIALISTS } from "@/lib/registry"
import type { Citation } from "@/lib/types"
import { ShieldCheck, GitCompareArrows } from "lucide-react"

type Point = { x: number; y: number }

type ImageSize = { width: number; height: number }
type Frame = { left: number; top: number; width: number; height: number }

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value))
}

function getGeometryCenter(citation: Citation): Point {
    if (citation.overlay?.points?.length) {
        const points = citation.overlay.points

        if (citation.overlay.type === "point") {
            return points[0]
        }

        if (citation.overlay.type === "line") {
            return points[Math.floor(points.length / 2)]
        }

        return {
            x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
            y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
        }
    }

    if (citation.bbox) {
        return {
            x: citation.bbox.x + citation.bbox.w / 2,
            y: citation.bbox.y + citation.bbox.h / 2,
        }
    }

    return { x: 0.5, y: 0.5 }
}

function getImageFrame(
    container: ImageSize,
    image: ImageSize,
): Frame {
    if (
        container.width <= 0 ||
        container.height <= 0 ||
        image.width <= 0 ||
        image.height <= 0
    ) {
        return {
            left: 0,
            top: 0,
            width: container.width,
            height: container.height,
        }
    }

    // Match CSS object-cover exactly. The old viewer drew normalized geometry
    // over the whole container even when object-cover cropped the source image.
    // That can move a correct model coordinate onto empty terrain. The overlay is
    // now rendered inside the actual displayed image frame.
    const scale = Math.max(
        container.width / image.width,
        container.height / image.height,
    )

    const width = image.width * scale
    const height = image.height * scale

    return {
        left: (container.width - width) / 2,
        top: (container.height - height) / 2,
        width,
        height,
    }
}

function BoundingOverlay({
                             citations,
                             accent,
                             activeId,
                         }: {
    citations: Citation[]
    accent: string
    activeId: string | null
}) {
    const spatial = citations.filter(
        (citation) => citation.bbox || citation.overlay,
    )

    if (!spatial.length) return null

    return (
        <svg
            className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            {spatial.map((citation, index) => {
                const bbox = citation.bbox
                const geometry = citation.overlay
                const active = activeId === citation.id

                if (geometry?.type === "point") {
                    const point = geometry.points[0]
                    if (!point) return null

                    return (
                        <g key={citation.id}>
                            <motion.circle
                                cx={point.x * 100}
                                cy={point.y * 100}
                                r={active ? 3.2 : 2.3}
                                fill={accent}
                                fillOpacity={active ? 0.2 : 0.1}
                                stroke={accent}
                                strokeWidth={active ? 1.2 : 0.8}
                                vectorEffect="non-scaling-stroke"
                                initial={{ opacity: 0, scale: 0.35 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.35, delay: index * 0.06 }}
                                style={{
                                    transformBox: "fill-box",
                                    transformOrigin: "center",
                                    filter: `drop-shadow(0 0 ${active ? 7 : 3}px ${accent})`,
                                }}
                            />
                            {active && (
                                <motion.circle
                                    cx={point.x * 100}
                                    cy={point.y * 100}
                                    r={6}
                                    fill="none"
                                    stroke={accent}
                                    strokeWidth={0.7}
                                    strokeDasharray="2 2"
                                    vectorEffect="non-scaling-stroke"
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.7, 1, 0.7] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            )}
                        </g>
                    )
                }

                if (geometry?.type === "line" || geometry?.type === "polygon") {
                    const points = geometry.points
                        .map((point) => `${point.x * 100},${point.y * 100}`)
                        .join(" ")

                    if (geometry.type === "line") {
                        return (
                            <g key={citation.id}>
                                <motion.polyline
                                    points={points}
                                    fill="none"
                                    stroke={accent}
                                    strokeWidth={active ? 4 : 2.5}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                    opacity={active ? 0.22 : 0.1}
                                    style={{ filter: `blur(${active ? 3 : 1.5}px)` }}
                                />
                                <motion.polyline
                                    points={points}
                                    fill="none"
                                    stroke={accent}
                                    strokeWidth={(geometry.strokeWidth ?? 1.8) * (active ? 1.4 : 1)}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                    opacity={active ? 1 : 0.9}
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: active ? 1 : 0.9 }}
                                    transition={{ duration: 0.8, delay: index * 0.08 }}
                                    style={{
                                        filter: active
                                            ? `drop-shadow(0 0 5px ${accent})`
                                            : `drop-shadow(0 0 2px ${accent})`,
                                    }}
                                />
                            </g>
                        )
                    }

                    return (
                        <g key={citation.id}>
                            <motion.polygon
                                points={points}
                                fill={accent}
                                fillOpacity={active ? 0.2 : 0.1}
                                stroke={accent}
                                strokeWidth={active ? 1.25 : 0.75}
                                vectorEffect="non-scaling-stroke"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.45, delay: index * 0.07 }}
                                style={{
                                    filter: active ? `drop-shadow(0 0 6px ${accent})` : "none",
                                }}
                            />
                        </g>
                    )
                }

                if (!bbox) return null

                return (
                    <g key={citation.id}>
                        <motion.rect
                            x={bbox.x * 100}
                            y={bbox.y * 100}
                            width={bbox.w * 100}
                            height={bbox.h * 100}
                            fill={accent}
                            fillOpacity={active ? 0.13 : 0.035}
                            stroke={accent}
                            strokeWidth={active ? 1.1 : 0.65}
                            vectorEffect="non-scaling-stroke"
                            rx={0.8}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.55, delay: index * 0.08 }}
                            style={{
                                filter: active ? `drop-shadow(0 0 6px ${accent})` : "none",
                            }}
                        />
                    </g>
                )
            })}
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
    onPick: (id: string | null) => void
}) {
    const visible = citations.filter(
        (citation) => citation.bbox || citation.overlay,
    )

    return (
        <div className="pointer-events-none absolute inset-0 z-30">
            {visible.map((citation) => {
                const active = activeId === citation.id
                const center = getGeometryCenter(citation)

                let labelX = citation.bbox?.x ?? center.x
                let labelY = citation.bbox?.y ?? center.y

                if (citation.overlay?.type === "point") {
                    labelX = center.x
                    labelY = center.y
                } else if (!citation.bbox) {
                    labelX = center.x
                    labelY = center.y
                }

                // Keep labels attached to the target but prevent them from being
                // rendered outside the image frame.
                labelX = clamp01(labelX)
                labelY = clamp01(labelY)

                return (
                    <button
                        key={citation.id}
                        type="button"
                        onClick={() => onPick(active ? null : citation.id)}
                        className="pointer-events-auto absolute max-w-[45%] rounded-md px-2 py-1 font-mono text-[10px] font-semibold leading-none transition-all duration-200"
                        style={{
                            left: `${labelX * 100}%`,
                            top: `${labelY * 100}%`,
                            background: active ? accent : "rgba(5,5,15,0.88)",
                            color: active ? "#05050f" : accent,
                            border: `1px solid ${accent}`,
                            boxShadow: active
                                ? `0 0 14px ${accent}99`
                                : `0 0 7px ${accent}33`,
                            transform:
                                citation.overlay?.type === "point"
                                    ? "translate(-50%, -115%)"
                                    : "translateY(-100%)",
                        }}
                    >
                        {citation.label}
                        {citation.source === "vision" && (
                            <span className="ml-1 opacity-60">AI</span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}

function ImageCanvas({
                         src,
                         alt,
                         citations,
                         accent,
                         activeId,
                         onPick,
                         priority = false,
                     }: {
    src: string
    alt: string
    citations: Citation[]
    accent: string
    activeId: string | null
    onPick: (id: string | null) => void
    priority?: boolean
}) {
    const hostRef = useRef<HTMLDivElement>(null)
    const [container, setContainer] = useState<ImageSize>({ width: 0, height: 0 })
    const [image, setImage] = useState<ImageSize>({ width: 1, height: 1 })

    useEffect(() => {
        const element = hostRef.current
        if (!element) return

        const update = () => {
            const rect = element.getBoundingClientRect()
            setContainer({ width: rect.width, height: rect.height })
        }

        update()
        const observer = new ResizeObserver(update)
        observer.observe(element)
        window.addEventListener("resize", update)

        return () => {
            observer.disconnect()
            window.removeEventListener("resize", update)
        }
    }, [])

    const frame = useMemo(
        () => getImageFrame(container, image),
        [container, image],
    )

    const showOverlays = citations.length > 0

    return (
        <div ref={hostRef} className="absolute inset-0 overflow-hidden bg-[#02020a]">
            <div
                key={`${src}-${image.width}-${image.height}`}
                className="absolute"
                style={{
                    left: frame.left,
                    top: frame.top,
                    width: frame.width || "100%",
                    height: frame.height || "100%",
                }}
            >
                <Image
                    src={src || "/placeholder.svg"}
                    alt={alt}
                    fill
                    sizes="60vw"
                    className="object-cover"
                    priority={priority}
                    onLoad={(event) => {
                        const target = event.currentTarget
                        if (target.naturalWidth && target.naturalHeight) {
                            setImage({
                                width: target.naturalWidth,
                                height: target.naturalHeight,
                            })
                        }
                    }}
                />

                {showOverlays && (
                    <>
                        <BoundingOverlay
                            citations={citations}
                            accent={accent}
                            activeId={activeId}
                        />
                        <OverlayLabels
                            citations={citations}
                            accent={accent}
                            activeId={activeId}
                            onPick={onPick}
                        />
                    </>
                )}
            </div>
        </div>
    )
}

function SwipeCompare({
                          before,
                          after,
                          alt,
                          citations,
                          accent,
                          activeId,
                          onPick,
                      }: {
    before: string
    after: string
    alt: string
    citations: Citation[]
    accent: string
    activeId: string | null
    onPick: (id: string | null) => void
}) {
    const [pct, setPct] = useState(50)
    const ref = useRef<HTMLDivElement>(null)
    const dragging = useRef(false)

    const setFromClientX = useCallback((clientX: number) => {
        const element = ref.current
        if (!element) return

        const rect = element.getBoundingClientRect()
        const next = ((clientX - rect.left) / rect.width) * 100
        setPct(Math.max(0, Math.min(100, next)))
    }, [])

    useEffect(() => {
        const move = (event: PointerEvent) => {
            if (dragging.current) setFromClientX(event.clientX)
        }
        const up = () => {
            dragging.current = false
        }

        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
        return () => {
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
        }
    }, [setFromClientX])

    return (
        <div
            ref={ref}
            className="relative h-full w-full select-none overflow-hidden rounded-xl"
            onPointerDown={(event) => {
                dragging.current = true
                setFromClientX(event.clientX)
            }}
        >
            <ImageCanvas
                src={before}
                alt={`${alt} — before`}
                citations={[]}
                accent={accent}
                activeId={null}
                onPick={() => undefined}
                priority
            />

            <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 0 0 ${pct}%)` }}
            >
                <ImageCanvas
                    src={after}
                    alt={`${alt} — after`}
                    citations={citations}
                    accent={accent}
                    activeId={activeId}
                    onPick={onPick}
                />
                <span className="absolute right-2 top-2 z-40 rounded-md bg-[#05050f]/75 px-2 py-0.5 font-mono text-[10px] text-brand-magenta">
                    T1 · after
                </span>
            </div>

            <span className="absolute left-2 top-2 z-40 rounded-md bg-[#05050f]/75 px-2 py-0.5 font-mono text-[10px] text-brand-cyan">
                T0 · before
            </span>

            <div
                className="absolute inset-y-0 z-50 w-0.5 bg-white/80"
                style={{ left: `${pct}%` }}
            >
                <div className="brand-gradient absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg">
                    <GitCompareArrows className="h-4 w-4 text-[#05050f]" />
                </div>
            </div>
        </div>
    )
}

export function ImageViewer() {
    const scene = useSatStore((state) => state.scene)
    const status = useSatStore((state) => state.status)
    const citations = useSatStore((state) => state.citations)
    const intent = useSatStore((state) => state.intent)
    const activeCitationId = useSatStore((state) => state.activeCitationId)
    const setActiveCitation = useSatStore((state) => state.setActiveCitation)

    const [pairView, setPairView] = useState<"optical" | "sar">("optical")

    const accent = intent ? SPECIALISTS[intent].accent : "#22d3ee"

    const visibleCitations = useMemo(
        () =>
            citations.filter((citation) => {
                if (!citation.bbox && !citation.overlay) return false

                if (scene.mode === "pair") {
                    const target = citation.target
                    return (
                        target === undefined ||
                        target === "both" ||
                        target === pairView
                    )
                }

                if (scene.mode === "bitemporal") {
                    return (
                        citation.target === "after" ||
                        citation.target === "both" ||
                        citation.target === undefined
                    )
                }

                return true
            }),
        [citations, scene.mode, pairView],
    )

    const showOverlays = status === "done" && visibleCitations.length > 0

    return (
        <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center justify-between">
                <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-2">
                    Scene viewer
                </h2>

                <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px]"
                    style={{
                        borderColor: "rgba(52,211,153,0.3)",
                        color: "#34d399",
                    }}
                >
                    <ShieldCheck className="h-3 w-3" />
                    Verified Demo Dataset
                </span>
            </div>

            <div className="glass-strong relative flex-1 overflow-hidden rounded-2xl p-2.5">
                <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-xl bg-[#02020a]">
                    {scene.mode === "bitemporal" ? (
                        <SwipeCompare
                            before={scene.images.before ?? ""}
                            after={scene.images.after ?? ""}
                            alt={scene.title}
                            citations={showOverlays ? visibleCitations : []}
                            accent={accent}
                            activeId={activeCitationId}
                            onPick={setActiveCitation}
                        />
                    ) : (
                        <>
                            <ImageCanvas
                                src={
                                    (scene.mode === "pair"
                                        ? pairView === "sar"
                                            ? scene.images.sar
                                            : scene.images.optical
                                        : scene.images.optical) || "/placeholder.svg"
                                }
                                alt={scene.title}
                                citations={showOverlays ? visibleCitations : []}
                                accent={accent}
                                activeId={activeCitationId}
                                onPick={setActiveCitation}
                                priority
                            />
                        </>
                    )}
                </div>

                {scene.mode === "pair" && (
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-[#05050f]/80 p-1 backdrop-blur">
                        {(["optical", "sar"] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setPairView(value)}
                                aria-pressed={pairView === value}
                                className={`rounded-full px-3.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                                    pairView === value
                                        ? "text-[#05050f]"
                                        : "text-muted hover:text-foreground"
                                }`}
                                style={
                                    pairView === value
                                        ? {
                                            backgroundColor:
                                                value === "sar"
                                                    ? "#2dd4bf"
                                                    : "#22d3ee",
                                        }
                                        : undefined
                                }
                            >
                                {value === "sar" ? "SAR" : "Optical"}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <p className="mt-2 text-center font-mono text-[10px] text-muted-2">
                {scene.mode === "bitemporal"
                    ? "Drag the handle to compare epochs · overlays mark detected change regions"
                    : scene.mode === "pair"
                        ? "Toggle optical / SAR · AI and evidence overlays follow the active modality"
                        : "AI-grounded targets appear on the imagery · click a label to focus"}
            </p>
        </div>
    )
}
