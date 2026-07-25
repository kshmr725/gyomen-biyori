"use client";

import { useState } from "react";
import { ShopCard } from "@/components/shop-card";
import type { Shop } from "@/lib/types";

type RamenSwipeDeckProps = {
  shops: Shop[];
  routeMinutes: Record<string, number>;
  currentIndex: number;
  onIndexChange: (newIndex: number) => void;
  onResetFilters: () => void;
  locationName: string;
};

export function RamenSwipeDeck({
  shops,
  routeMinutes,
  currentIndex,
  onIndexChange,
  onResetFilters,
  locationName,
}: RamenSwipeDeckProps) {
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  if (!shops || shops.length === 0) {
    return (
      <div className="empty-state">
        <h2>沒有完全符合條件的店家</h2>
        <p>請嘗試切換交通方式或放寬時間與預算限制。</p>
        <button className="button button-primary" onClick={onResetFilters}>
          重新設定條件
        </button>
      </div>
    );
  }

  const currentShop = shops[currentIndex];
  const deltaX = dragStartX !== null && dragCurrentX !== null ? dragCurrentX - dragStartX : 0;

  function handleNext() {
    onIndexChange((currentIndex + 1) % shops.length);
  }

  function handlePrev() {
    onIndexChange((currentIndex - 1 + shops.length) % shops.length);
  }

  // Touch Event Handlers
  function handleTouchStart(e: React.TouchEvent) {
    setDragStartX(e.touches[0].clientX);
    setDragCurrentX(e.touches[0].clientX);
    setIsSwiping(true);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isSwiping) return;
    setDragCurrentX(e.touches[0].clientX);
  }

  function handleTouchEnd() {
    if (!isSwiping) return;
    if (deltaX < -80) {
      handleNext();
    } else if (deltaX > 80) {
      handlePrev();
    }
    setDragStartX(null);
    setDragCurrentX(null);
    setIsSwiping(false);
  }

  // Mouse Drag Handlers
  function handleMouseDown(e: React.MouseEvent) {
    setDragStartX(e.clientX);
    setDragCurrentX(e.clientX);
    setIsSwiping(true);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isSwiping) return;
    setDragCurrentX(e.clientX);
  }

  function handleMouseUp() {
    if (!isSwiping) return;
    if (deltaX < -80) {
      handleNext();
    } else if (deltaX > 80) {
      handlePrev();
    }
    setDragStartX(null);
    setDragCurrentX(null);
    setIsSwiping(false);
  }

  const rotateDeg = deltaX * 0.04;
  const cardStyle = isSwiping
    ? {
        transform: `translateX(${deltaX}px) rotate(${rotateDeg}deg)`,
        transition: "none",
        cursor: "grabbing",
      }
    : {
        transform: "translateX(0px) rotate(0deg)",
        transition: "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        cursor: "grab",
      };

  return (
    <div className="swipe-deck-container">
      <div className="swipe-deck-header">
        <p className="eyebrow">TODAY&apos;S RAMEN MATCH ({currentIndex + 1} / {shops.length})</p>
        <div className="swipe-counter-badge">
          <span>以「{locationName}」為中心 · 第 {currentIndex + 1} / {shops.length} 間</span>
        </div>
      </div>

      <div
        className="swipe-card-wrapper"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Swipe Overlays */}
        {deltaX < -40 && (
          <div className="swipe-hint-badge swipe-left">
            👈 換下一間
          </div>
        )}
        {deltaX > 40 && (
          <div className="swipe-hint-badge swipe-right">
            👉 上一間
          </div>
        )}

        <div className="swipe-card-animator" style={cardStyle}>
          <ShopCard
            shop={currentShop}
            walkingMinutes={routeMinutes[currentShop.id] ?? 0}
            featured
          />
        </div>
      </div>

      {/* Swipe Controls & Actions */}
      <div className="swipe-actions-row">
        <button
          className="button button-ghost swipe-nav-btn"
          onClick={handlePrev}
          title="切換到上一間店家"
        >
          👈 上一間
        </button>

        <a
          className="button button-primary swipe-main-btn"
          target="_blank"
          rel="noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(currentShop.address)}`}
        >
          📍 開啟 Google Maps 導航
        </a>

        <button
          className="button button-ghost swipe-nav-btn"
          onClick={handleNext}
          title="切換到下一間店家"
        >
          🔄 換下一間 👉
        </button>
      </div>

      <div className="swipe-gesture-hint">
        💡 提示：在卡片上向左滑／向右滑即可順暢切換拉麵店！
      </div>
    </div>
  );
}
