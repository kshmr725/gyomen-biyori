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

    // Explore Page
    exploreEyebrow: "BROWSE THE CITY",
    exploreTitle: "自由逛逛",
    exploreDesc: "地圖和清單一起看，先不用做決定。",
    searchHeading: "🔍 搜尋地點 / 捷運站為中心點",
    searchPlaceholder: "搜尋捷運站、地標或地址 (例：中山站、西門町)",
    searchButton: "搜尋地點",
    popularHotspots: "熱門捷運站與地標：",
    useGPSButton: "📡 使用目前 GPS 自動定位",
    shopsCount: "{count} 間店家 (中心點：{center})",
    usingRouteFrom: "使用以「{name}」為中心的路線",
    calculatingRoute: "正在計算預計地點步行時間…",
    sortWalk: "步行/距離排序",
    sortScore: "綜合評分排序",
    sortQueue: "排隊時間排序",
    mapSelectedBanner: "📍 地圖已選取：",
    mobileTabList: "📋 店家清單",
    mobileTabMap: "🗺️ 互動地圖",

    // Wizard & Controls
    chooseEyebrow: "STEP-BY-STEP WIZARD",
    chooseTitle: "幫我選一間",
    chooseSubtitle: "回答三個簡單問題，為今天的胃口找到最適合的拉麵。",
    step1Header: "1. 選擇所在地點",
    step2Header: "2. 選擇交通與喜好",
    step3Header: "3. 今日拉麵推薦",
    btnNextStep: "下一步 →",
    btnPrevStep: "← 上一步",
    btnStartOver: "↺ 重新選擇",
    btnPickOne: "🍜 幫我選一間",
    topRecommendationBadge: "✨ 本日最佳推薦",

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
    signatureItem: "招牌主打：",
    basePrice: "基本款 NT$",
    viewMenuBtn: "查看完整菜單與圖片 →",
    favoriteBtn: "❤️ 收藏",
    favoritedBtn: "❤️ 已收藏",
    queueNoneText: "通常不用排 (依時段估算)",
    queueUnder30Text: "約 15-30 分",
    queueLongText: "長排隊名店 (30分+)",

    // Profile & Love Modal
    profileTitle: "我的個人紀錄與雲端足跡",
    profileLoginPrompt: "請先登入 Google 帳號以查看您的雲端收藏與足跡！",
    myFavorites: "❤️ 我的收藏店家",
    myVisits: "🍜 最近吃過足跡",
    addVisitTitle: "📝 新增吃過紀錄",
    submitVisitBtn: "儲存吃過紀錄",
    noFavoritesYet: "尚未收藏任何店家。前往探索地圖點擊「❤️ 收藏」吧！",
    noVisitsYet: "尚無吃過紀錄。開始記錄你的拉麵美食地圖吧！",

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

    // Explore Page
    exploreEyebrow: "BROWSE THE CITY",
    exploreTitle: "Explore Freely",
    exploreDesc: "View map and list together, take your time to decide.",
    searchHeading: "🔍 Search Location or MRT Station Center",
    searchPlaceholder: "Search MRT station, landmark or address (e.g. Zhongshan, Ximending)",
    searchButton: "Search",
    popularHotspots: "Popular Landmarks & MRT Stations:",
    useGPSButton: "📡 Use Current GPS Location",
    shopsCount: "{count} Shops (Center: {center})",
    usingRouteFrom: "Routes centered on '{name}'",
    calculatingRoute: "Calculating walk times…",
    sortWalk: "Sort by Distance",
    sortScore: "Sort by Rating",
    sortQueue: "Sort by Queue Time",
    mapSelectedBanner: "📍 Map Selected:",
    mobileTabList: "📋 Shop List",
    mobileTabMap: "🗺️ Interactive Map",

    // Wizard & Controls
    chooseEyebrow: "STEP-BY-STEP WIZARD",
    chooseTitle: "Pick a Ramen Shop",
    chooseSubtitle: "Answer 3 quick questions to find your perfect bowl today.",
    step1Header: "1. Choose Location",
    step2Header: "2. Preferences & Travel",
    step3Header: "3. Your Top Recommendation",
    btnNextStep: "Next Step →",
    btnPrevStep: "← Previous",
    btnStartOver: "↺ Start Over",
    btnPickOne: "🍜 Pick One Bowl",
    topRecommendationBadge: "✨ Top Match Today",

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
    signatureItem: "House Signature:",
    basePrice: "Base Price NT$",
    viewMenuBtn: "View Full Menu & Photos →",
    favoriteBtn: "❤️ Favorite",
    favoritedBtn: "❤️ Saved",
    queueNoneText: "Usually No Queue (est. by hour)",
    queueUnder30Text: "Est. 15-30 mins",
    queueLongText: "Popular Shop (30m+ wait)",

    // Profile & Love Modal
    profileTitle: "My Journal & Cloud Footprints",
    profileLoginPrompt: "Please sign in with Google to view your saved favorites and visit logs!",
    myFavorites: "❤️ Saved Favorites",
    myVisits: "🍜 Recent Visits",
    addVisitTitle: "📝 Add Visit Log",
    submitVisitBtn: "Save Visit Log",
    noFavoritesYet: "No saved favorites yet. Explore the map and click '❤️ Favorite'!",
    noVisitsYet: "No visit logs yet. Start logging your ramen journey!",

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
