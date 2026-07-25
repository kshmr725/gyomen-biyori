"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { LoveModal } from "@/components/love-modal";

export function SiteHeader() {
  const [clickCount, setClickCount] = useState(0);
  const [showLoveModal, setShowLoveModal] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);

  function handleLogoClick(e: React.MouseEvent) {
    // If holding Shift or rapid clicking 5 times
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
          <span className="brand-jp">魚麵日和</span>
          <span>GYOMEN BIYORI</span>
        </Link>
        <nav>
          <Link href="/choose">幫我選</Link>
          <Link href="/explore">逛地圖</Link>
          <Link href="/profile">我的紀錄</Link>
          <AuthButton />
        </nav>
      </header>

      <LoveModal isOpen={showLoveModal} onClose={() => setShowLoveModal(false)} />
    </>
  );
}
