"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <div className="brand-lockup">
            <span className="brand-jp">{t.brandTitle}</span>
            <span className="brand-en">GYOMEN BIYORI</span>
          </div>
          <p className="footer-subtext">{t.footerSubtext}</p>
        </div>

        <nav className="footer-links">
          <Link href="/choose">{t.navChoose}</Link>
          <Link href="/explore">{t.navExplore}</Link>
          <Link href="/profile">{t.navProfile}</Link>
        </nav>

        <div className="footer-copyright">
          <p>{t.copyright}</p>
          <p className="ownership-text">{t.ownership}</p>
        </div>
      </div>
    </footer>
  );
}
