"use client";

import Link from "next/link";
import { HeroArt } from "@/components/hero-art";
import { useLanguage } from "@/lib/i18n";

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className="home-shell">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{t.eyebrow}</p>
          <h1>{t.heroTitle}</h1>
          <p className="subtitle">{t.heroSubtitle}</p>
          <p className="lede">{t.heroLede}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/choose">
              {t.btnPick}
            </Link>
            <Link className="button button-ghost" href="/explore">
              {t.btnExplore}
            </Link>
          </div>
          <p className="microcopy">{t.heroMicrocopy}</p>
        </div>

        <HeroArt />
      </section>

      <section className="editorial-strip">
        <article>
          <span>01</span>
          <h2>{t.step1Title}</h2>
          <p>{t.step1Desc}</p>
        </article>
        <article>
          <span>02</span>
          <h2>{t.step2Title}</h2>
          <p>{t.step2Desc}</p>
        </article>
        <article>
          <span>03</span>
          <h2>{t.step3Title}</h2>
          <p>{t.step3Desc}</p>
        </article>
      </section>
    </main>
  );
}
