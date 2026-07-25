"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { LoveModal } from "@/components/love-modal";
import { useLanguage } from "@/lib/i18n";

export function SiteHeader() {
  const { lang, setLang, t } = useLanguage();
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
          <span>GYOMEN BIYORI</span>
        </Link>

        <nav>
          <Link href="/choose">{t.navChoose}</Link>
          <Link href="/explore">{t.navExplore}</Link>
          <Link href="/profile">{t.navProfile}</Link>
          
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
      </header>

      <LoveModal isOpen={showLoveModal} onClose={() => setShowLoveModal(false)} />
    </>
  );
}
