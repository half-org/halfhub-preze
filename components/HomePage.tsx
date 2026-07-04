import { COPY } from '@/lib/content'
import type { Lang } from '@/lib/types'
import { Loader } from '@/components/dom/Loader'
import { Nav } from '@/components/dom/Nav'
import { Hero } from '@/components/dom/Hero'
import { ServicesSection } from '@/components/dom/ServicesSection'
import { ReferencesSection } from '@/components/dom/ReferencesSection'
import { AiReadySection } from '@/components/dom/AiReadySection'
import { AboutSection } from '@/components/dom/AboutSection'
import { CtaSection } from '@/components/dom/CtaSection'
import { ProcessSection } from '@/components/dom/ProcessSection'
import { ContactSection } from '@/components/dom/ContactSection'
import { SectionBridge } from '@/components/dom/SectionBridge'
import { Footer } from '@/components/dom/Footer'

export function HomePage({ lang }: { lang: Lang }) {
  const t = COPY[lang]
  return (
    <>
      <Loader />
      <Nav lang={lang} />
      <main>
        <Hero lang={lang} />
        {/* home→services and services→references ride the canvas seam glow;
            every other boundary is stitched by a SectionBridge thread */}
        <ServicesSection lang={lang} />
        <ReferencesSection lang={lang} />
        <SectionBridge num="04" label={t.aiready.kicker} />
        <AiReadySection lang={lang} />
        <SectionBridge num="05" label={t.about.kicker} />
        <AboutSection lang={lang} />
        <SectionBridge num="06" label={t.cta.demo.kicker} />
        <CtaSection lang={lang} />
        <SectionBridge num="07" label={t.process.kicker} />
        <ProcessSection lang={lang} />
        <SectionBridge num="08" label={t.contact.kicker} />
        <ContactSection lang={lang} />
      </main>
      <Footer lang={lang} />
    </>
  )
}
