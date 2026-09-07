import { SiteNav } from "@/components/landing/site-nav"
import { Hero } from "@/components/landing/hero"
import { Capabilities } from "@/components/landing/capabilities"
import { PipelineSection } from "@/components/landing/pipeline-section"
import { ArchitectureSection } from "@/components/landing/architecture-section"
import { SiteFooter } from "@/components/landing/site-footer"

export default function HomePage() {
  return (
    <main className="relative">
      <SiteNav />
      <Hero />
      <Capabilities />
      <PipelineSection />
      <ArchitectureSection />
      <SiteFooter />
    </main>
  )
}
