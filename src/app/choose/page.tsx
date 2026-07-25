"use client";

import { RecommendationWizard } from "@/components/recommendation-wizard";
import { useLanguage } from "@/lib/i18n";

export default function ChoosePage() {
  const { t } = useLanguage();

  return (
    <main className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">{t.chooseEyebrow}</p>
        <h1>{t.chooseTitle}</h1>
        <p>{t.chooseSubtitle}</p>
      </div>
      <RecommendationWizard />
    </main>
  );
}
