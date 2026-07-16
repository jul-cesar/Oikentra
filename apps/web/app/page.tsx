import { SiteHeader } from "@/components/landing/site-header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/footer"
import { HowItWorks } from "@/components/landing/how-it-works"
import { CtaFooter } from "@/components/landing/cta-footer"

export default function Home() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <CtaFooter />
      </main>
    </div>
  )
}
