"use client";

import { ProfilePanel } from "@/components/profile-panel";
import { useLanguage } from "@/lib/i18n";

export default function ProfilePage() {
  const { t } = useLanguage();

  return (
    <main className="page-shell">
      <div className="page-heading">
        <p className="eyebrow">MY RAMEN LOG</p>
        <h1>{t.profileTitle}</h1>
        <p>Your personal ramen footprints, saved favorites, and visit history.</p>
      </div>
      <ProfilePanel />
    </main>
  );
}
