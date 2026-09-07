"use client"

import Image from "next/image"
import { motion } from "motion/react"

/**
 * Decorative hero panel: a live scene tile with an animated scan sweep,
 * detection boxes drawing themselves in, and a floating "answer" chip — a
 * miniature of what the console does.
 */
export function HeroScan() {
  return (
    <div className="glass-strong relative mx-auto aspect-[16/9] w-full max-w-4xl overflow-hidden rounded-3xl">
      <Image
        src="/scenes/urban-optical.png"
        alt="Satellite optical view of a coastal harbor city used as a demonstration scene"
        fill
        priority
        sizes="(max-width: 768px) 100vw, 900px"
        className="object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05050f] via-[#05050f]/20 to-transparent" />

      {/* scan sweep */}
      <motion.div
        aria-hidden
        className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-brand-cyan/15 to-transparent"
        initial={{ x: "-120%" }}
        animate={{ x: "320%" }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
      />

      {/* detection boxes */}
      <svg aria-hidden className="absolute inset-0 h-full w-full" viewBox="0 0 100 56.25" preserveAspectRatio="none">
        <motion.rect
          x="9" y="26" width="24" height="14" rx="1"
          fill="none" stroke="#22d3ee" strokeWidth="0.4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        />
        <motion.rect
          x="55" y="15" width="18" height="12" rx="1"
          fill="none" stroke="#e879f9" strokeWidth="0.4"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
        />
      </svg>

      <motion.div
        className="glass absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-xl px-4 py-3 md:max-w-md"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.6 }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-cyan/15 font-mono text-xs text-brand-cyan">
          VQA
        </span>
        <p className="text-left text-sm text-foreground/90">
          <span className="text-muted">Q: How many ships are in the harbor?</span>
          <br />
          <span className="font-medium">A: 4 vessels moored in the basin.</span>
        </p>
      </motion.div>
    </div>
  )
}
