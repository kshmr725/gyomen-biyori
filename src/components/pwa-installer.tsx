"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS] = useState(() => {
    if (typeof window === "undefined") return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  });
  const [isStandalone] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(display-mode: standalone)").matches || !!(navigator as unknown as { standalone?: boolean }).standalone;
  });
  const [showBanner, setShowBanner] = useState(() => {
    if (typeof window === "undefined") return false;
    const isApp = window.matchMedia("(display-mode: standalone)").matches || !!(navigator as unknown as { standalone?: boolean }).standalone;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    return iosDevice && !isApp;
  });

  useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Android / Chrome BeforeInstallPrompt Event
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
  }, []);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }

  if (isStandalone || !showBanner) return null;

  return (
    <div className="pwa-install-banner paper-card">
      <div className="pwa-banner-content">
        <span className="pwa-icon">📱</span>
        <div className="pwa-text-box">
          <strong>將「魚麵日和」安裝至手機桌面</strong>
          <p className="microcopy">
            {isIOS
              ? "點擊瀏覽器下方「分享」圖示 ➔ 選取『加入主畫面』即可在手機當 App 使用！"
              : "將網站直接新增至手機主畫面，隨點隨開！"}
          </p>
        </div>
      </div>

      <div className="pwa-actions">
        {deferredPrompt && (
          <button className="button button-primary pwa-btn" onClick={handleInstallClick}>
            📲 一鍵安裝 App
          </button>
        )}
        <button className="pwa-close-btn" onClick={() => setShowBanner(false)}>
          ✕
        </button>
      </div>
    </div>
  );
}
