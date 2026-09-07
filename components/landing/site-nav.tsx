import Link from "next/link"
import { Logo } from "@/components/logo"
import { ArrowUpRight } from "lucide-react"

export function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav className="glass flex w-full max-w-6xl items-center justify-between rounded-2xl px-4 py-3 md:px-6">
        <Link href="/" className="rounded-lg">
          <Logo />
        </Link>
        <div className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a href="#capabilities" className="rounded transition-colors hover:text-foreground">
            Capabilities
          </a>
          <a href="#pipeline" className="rounded transition-colors hover:text-foreground">
            Pipeline
          </a>
          <a href="#architecture" className="rounded transition-colors hover:text-foreground">
            Architecture
          </a>
        </div>
        <Link
          href="/app"
          className="brand-gradient-animated inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-[#05050f] transition-transform hover:scale-[1.03]"
        >
          Launch console
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </nav>
    </header>
  )
}
