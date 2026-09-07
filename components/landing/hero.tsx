"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { ArrowRight, Radar, Sparkles } from "lucide-react"
import { HeroScan } from "./hero-scan"

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const } },
}

export function Hero() {
  return (
    <section className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-36 md:pt-44">
      <motion.div variants={container} initial="hidden" animate="show" className="flex w-full flex-col items-center text-center">
        <motion.div variants={item}>
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted">
            <Sparkles className="h-3.5 w-3.5 text-brand-cyan" />
            Agentic remote-sensing intelligence
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="mt-6 max-w-4xl text-balance font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          Ask satellite imagery <span className="brand-text">anything.</span>
        </motion.h1>

        <motion.p variants={item} className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted">
          Across Earth <span className="text-foreground/80">and beyond</span>, SatQuery routes your question to the
          right vision specialist — captioning, visual QA, grounding, change detection or optical + SAR fusion — then
          returns a grounded, evidence-backed answer with a transparent reasoning trace. From coastal cities and flood
          deltas to lunar highlands and permanently shadowed polar craters.
        </motion.p>

        <motion.div variants={item} className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/app"
            className="brand-gradient-animated group inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-semibold text-[#05050f] transition-transform hover:scale-[1.03]"
          >
            Open the console
            <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#pipeline"
            className="glass glass-hover inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium text-foreground"
          >
            <Radar className="h-4.5 w-4.5 text-brand-cyan" />
            See how it reasons
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        variants={item}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="mt-16 w-full"
      >
        <HeroScan />
      </motion.div>
    </section>
  )
}
