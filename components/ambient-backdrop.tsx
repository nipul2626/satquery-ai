"use client"

import { useEffect, useRef } from "react"

/**
 * Fixed full-viewport canvas painting a slow parallax starfield plus two
 * drifting nebula glows. Honors prefers-reduced-motion by rendering a single
 * static frame. Kept intentionally cheap (a few hundred points) so it never
 * competes with the reasoning UI for the main thread.
 */
export function AmbientBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let width = 0
    let height = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    type Star = { x: number; y: number; r: number; base: number; twinkle: number; depth: number }
    let stars: Star[] = []

    function seed() {
      const count = Math.min(260, Math.floor((width * height) / 9000))
      stars = Array.from({ length: count }, () => {
        const depth = Math.random()
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          r: 0.4 + depth * 1.6,
          base: 0.2 + Math.random() * 0.6,
          twinkle: Math.random() * Math.PI * 2,
          depth,
        }
      })
    }

    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    function draw(t: number) {
      ctx.clearRect(0, 0, width, height)

      // Nebula glows
      const drift = reduceMotion ? 0 : t * 0.00004
      const g1 = ctx.createRadialGradient(
        width * (0.3 + Math.sin(drift) * 0.05),
        height * 0.25,
        0,
        width * 0.3,
        height * 0.25,
        Math.max(width, height) * 0.5,
      )
      g1.addColorStop(0, "rgba(168, 85, 247, 0.10)")
      g1.addColorStop(1, "rgba(168, 85, 247, 0)")
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, width, height)

      const g2 = ctx.createRadialGradient(
        width * (0.75 + Math.cos(drift * 1.3) * 0.05),
        height * 0.8,
        0,
        width * 0.75,
        height * 0.8,
        Math.max(width, height) * 0.5,
      )
      g2.addColorStop(0, "rgba(34, 211, 238, 0.08)")
      g2.addColorStop(1, "rgba(34, 211, 238, 0)")
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, width, height)

      for (const s of stars) {
        const tw = reduceMotion ? s.base : s.base + Math.sin(t * 0.001 + s.twinkle) * 0.28
        ctx.globalAlpha = Math.max(0, Math.min(1, tw))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = s.depth > 0.7 ? "#c4b5fd" : "#ffffff"
        ctx.fill()
      }
      ctx.globalAlpha = 1

      if (!reduceMotion) raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize)
    if (reduceMotion) {
      draw(0)
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,transparent_55%,rgba(5,5,15,0.7))]" />
    </div>
  )
}
