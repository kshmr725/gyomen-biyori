"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type Language = "zh" | "en";

export const translations = {
  zh: {
    // Nav & Header
    brandTitle: "魚麵日和",
    brandSubtitle: "小魚的台北拉麵地圖",
    navChoose: "幫我選",
    navExplore: "逛地圖",
    navProfile: "我的紀錄",
    loginGoogle: "Google 登入",
    logout: "登出",
    guestBrowse: "免登入瀏覽",

    // Hero
    eyebrow: "TAIPEI RAMEN JOURNAL",
    heroTitle: "魚麵日和",
    heroSubtitle: "小魚的台北拉麵地圖",
    heroLede: "地點選好了，剩下的交給我們。用步行時間、預算和排隊耐心，替今天選出一碗剛剛好的拉麵。",
    btnPick: "幫我選一間",
    btnExplore: "自由逛逛",
    heroMicrocopy: "不做排行榜，也不讓你無限重抽。今天就吃這間。",

    // Editorial strip
    step1Title: "點一個位置",
    step1Desc: "從現在所在地或台北任何一個角落開始。",
    step2Title: "回答三件事",
    step2Desc: "走多久、花多少、願不願意排隊。",
    step3Title: "只給一個答案",
    step3Desc: "從最符合的前三間中替你做決定。",

    // Wizard & Controls
    modeWalk: "🚶 純步行 (15分內)",
    modeMrt: "🚇 捷運 + 步行",
    modeAny: "🛵 機車/隨意",
    budgetCheap: "💰 平價 (NT$250 內)",
    budgetStandard: "🍜 標準 (NT$350 內)",
    budgetUnlimited: "💎 無限制",
    queueNone: "⚡ 免排隊",
    queueUnder30: "⏳ 30分內",
    queueUnlimited: "🍵 願意耐心排隊",
    noveltyNew: "✨ 沒吃過的優先",
    noveltyRepeat: "🔄 吃過的也行",

    // Card & Details
    openNow: "營業中",
    closed: "未營業",
    signatureItem: "招牌主打",
    basePrice: "基本款 NT$",
    viewMenuBtn: "查看完整菜單與圖片 →",

    // Profile & Love Modal
    profileTitle: "我的個人紀錄與雲端足跡",
    myFavorites: "❤️ 我的收藏店家",
    myVisits: "🍜 最近吃過足跡",
    addVisitTitle: "📝 新增吃過紀錄",
    submitVisitBtn: "儲存吃過紀錄",

    // Footer
    footerSubtext: "小魚的台北拉麵地圖 · 專屬美食指南",
    copyright: "© 2026 魚麵日和 GYOMEN BIYORI. All Rights Reserved.",
    ownership: "本網站作品與相關專利權、著作權及所有權歸屬 小魚 與 魚麵日和 團隊所有。",
  },
  en: {
    // Nav & Header
    brandTitle: "Gyomen Biyori",
    brandSubtitle: "Little Fish's Taipei Ramen Journal",
    navChoose: "Pick for Me",
    navExplore: "Explore Map",
    navProfile: "My Journal",
    loginGoogle: "Sign in with Google",
    logout: "Sign Out",
    guestBrowse: "Guest Mode",

    // Hero
    eyebrow: "TAIPEI RAMEN JOURNAL",
    heroTitle: "Gyomen Biyori",
    heroSubtitle: "Little Fish's Taipei Ramen Guide",
    heroLede: "Set your location, leave the decision to us. Filter by travel time, budget, and queue patience to pick the perfect bowl today.",
    btnPick: "Pick a Shop",
    btnExplore: "Explore Freely",
    heroMicrocopy: "No rank lists, no endless re-rolls. Just one perfect bowl today.",

    // Editorial strip
    step1Title: "Pick Your Location",
    step1Desc: "Start from where you are or anywhere in Taipei.",
    step2Title: "Answer 3 Questions",
    step2Desc: "How far, how much, and how long to wait.",
    step3Title: "Get One Best Answer",
    step3Desc: "We pick the single best shop out of the top 3 matches.",

    // Wizard & Controls
    modeWalk: "🚶 Walking Only (≤15m)",
    modeMrt: "🚇 MRT Transit + Walk",
    modeAny: "🛵 Scooter / Any",
    budgetCheap: "💰 Budget (≤NT$250)",
    budgetStandard: "🍜 Standard (≤NT$350)",
    budgetUnlimited: "💎 Unlimited",
    queueNone: "⚡ No Queue",
    queueUnder30: "⏳ Under 30m",
    queueUnlimited: "🍵 Willing to Wait",
    noveltyNew: "✨ Unvisited First",
    noveltyRepeat: "🔄 Include Favorites",

    // Card & Details
    openNow: "Open Now",
    closed: "Closed",
    signatureItem: "House Signature",
    basePrice: "Base Price NT$",
    viewMenuBtn: "View Full Menu & Photos →",

    // Profile & Love Modal
    profileTitle: "My Journal & Cloud Footprints",
    myFavorites: "❤️ Saved Favorites",
    myVisits: "🍜 Recent Visits",
    addVisitTitle: "📝 Add Visit Log",
    submitVisitBtn: "Save Visit Log",

    // Footer
    footerSubtext: "Little Fish's Taipei Ramen Journal & Guide",
    copyright: "© 2026 GYOMEN BIYORI. All Rights Reserved.",
    ownership: "All rights, patents, and copyright belong to Little Fish & Gyomen Biyori team.",
  },
};

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.zh;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "zh",
  setLang: () => {},
  t: translations.zh,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gyomen:lang") as Language;
      if (saved === "zh" || saved === "en") return saved;
    }
    return "zh";
  });

  function setLang(newLang: Language) {
    setLangState(newLang);
    localStorage.setItem("gyomen:lang", newLang);
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
