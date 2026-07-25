"use client";

import { ExploreView } from "@/components/explore-view";
import { useLanguage } from "@/lib/i18n";

export default function ExplorePage() {
  const { t } = useLanguage();

  return (
    <main className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">{t.exploreEyebrow}</p>
        <h1>{t.exploreTitle}</h1>
        <p>{t.exploreDesc}</p>
      </div>
      <ExploreView />
    </main>
  );
}
