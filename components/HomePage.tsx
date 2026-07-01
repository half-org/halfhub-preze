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
import { Footer } from '@/components/dom/Footer'

export function HomePage({ lang }: { lang: Lang }) {
  return (
    <>
      <Loader />
      <Nav lang={lang} />
      <main>
        <Hero lang={lang} />
        <ServicesSection lang={lang} />
        <ReferencesSection lang={lang} />
        <AiReadySection lang={lang} />
        <AboutSection lang={lang} />
        <CtaSection lang={lang} />
        <ProcessSection lang={lang} />
        <ContactSection lang={lang} />
      </main>
      <Footer lang={lang} />
    </>
  )
}
