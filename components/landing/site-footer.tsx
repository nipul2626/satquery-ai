import Link from "next/link"
import { Logo } from "@/components/logo"

export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-6xl px-4 pb-12 pt-8">
      <div className="glass rounded-3xl p-8 md:p-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="max-w-md">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              An agentic remote-sensing console for grounded, auditable answers over satellite imagery.
            </p>
          </div>
          <Link
            href="/app"
            className="brand-gradient-animated inline-flex w-fit items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-[#05050f] transition-transform hover:scale-[1.03]"
          >
            Launch the console
          </Link>
        </div>

        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-xs leading-relaxed text-muted-2">
            <span className="font-semibold text-muted">Provenance &amp; ethics:</span> All imagery in this demo is
            synthetically generated for demonstration and carries no real coordinates. Task structures are modeled on
            public remote-sensing benchmarks (VQA, captioning, grounding, change detection, optical + SAR fusion).
            Answers are grounded in a curated evidence store and should not be used for operational decisions.
          </p>
        </div>
      </div>
    </footer>
  )
}
