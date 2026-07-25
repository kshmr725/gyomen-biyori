"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthButton } from "@/components/auth-button";
import { LoveModal } from "@/components/love-modal";
import { useLanguage } from "@/lib/i18n";

export function SiteHeader() {
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();
  const [clickCount, setClickCount] = useState(0);
  const [showLoveModal, setShowLoveModal] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  function handleLogoClick(e: React.MouseEvent) {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    setIsPulsing(true);

    setTimeout(() => setIsPulsing(false), 500);

    if (nextCount >= 5) {
      e.preventDefault();
      setShowLoveModal(true);
      setClickCount(0);
    }
  }

  return (
    <>
      <header className="site-header">
        <Link
          href="/"
          className={`brand-lockup ${isPulsing ? "heartbeat-anim" : ""}`}
          onClick={handleLogoClick}
          title="連點 5 次開啟隱藏彩蛋"
        >
          <span className="brand-jp">{t.brandTitle}</span>
          <span className="brand-en">GYOMEN BIYORI</span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav">
          <Link href="/choose" className={pathname === "/choose" ? "active" : ""}>{t.navChoose}</Link>
          <Link href="/explore" className={pathname === "/explore" ? "active" : ""}>{t.navExplore}</Link>
          <Link href="/profile" className={pathname === "/profile" ? "active" : ""}>{t.navProfile}</Link>
          
          {/* Bilingual Language Switcher Toggle */}
          <div className="lang-switcher">
            <button
              className={`lang-btn ${lang === "zh" ? "active" : ""}`}
              onClick={() => setLang("zh")}
            >
              繁中
            </button>
            <span className="lang-divider">/</span>
            <button
              className={`lang-btn ${lang === "en" ? "active" : ""}`}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </div>

          <AuthButton />
        </nav>

        {/* Mobile Header Right Bar (Language Switcher + Auth) */}
        <div className="mobile-header-actions">
          <div className="lang-switcher">
            <button
              className={`lang-btn ${lang === "zh" ? "active" : ""}`}
              onClick={() => setLang("zh")}
            >
              繁中
            </button>
            <span className="lang-divider">/</span>
            <button
              className={`lang-btn ${lang === "en" ? "active" : ""}`}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </div>
          <AuthButton />
        </div>
      </header>

      {/* Floating iOS App Style Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <Link href="/choose" className={`mobile-nav-item ${pathname === "/choose" ? "active" : ""}`}>
          <span className="mobile-nav-icon">🍜</span>
          <span className="mobile-nav-label">{t.navChoose}</span>
        </Link>
        <Link href="/explore" className={`mobile-nav-item ${pathname === "/explore" ? "active" : ""}`}>
          <span className="mobile-nav-icon">🗺️</span>
          <span className="mobile-nav-label">{t.navExplore}</span>
        </Link>
        <Link href="/profile" className={`mobile-nav-item ${pathname === "/profile" ? "active" : ""}`}>
          <span className="mobile-nav-icon">📝</span>
          <span className="mobile-nav-label">{t.navProfile}</span>
        </Link>
      </nav>

      <LoveModal isOpen={showLoveModal} onClose={() => setShowLoveModal(false)} />
    </>
  );
}
