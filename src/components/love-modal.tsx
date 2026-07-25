"use client";

import { useState } from "react";

type LoveModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function LoveModal({ isOpen, onClose }: LoveModalProps) {
  const [loveHearts, setLoveHearts] = useState(520);

  if (!isOpen) return null;

  return (
    <div className="love-modal-overlay" onClick={onClose}>
      <div className="love-modal-content paper-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        <div className="love-header-badge">
          <span>🐟🍜 SPECIAL EDITION FOR LITTLE FISH</span>
        </div>

        <h2 className="love-title">小魚專屬拉麵美食指南</h2>

        <div className="love-message-box">
          <p className="love-paragraph">
            這座「魚麵日和」地圖，是用來記錄我們一起吃拉麵的點點滴滴。地點選好了，剩下的就交給我！
          </p>
          <p className="love-paragraph highlight">
            希望陪妳吃遍台北、日本與世界上的每一碗美味拉麵 🍜✨
          </p>
        </div>

        <div className="love-counter-box">
          <button
            className="love-heart-btn"
            onClick={() => setLoveHearts((prev) => prev + 1)}
          >
            🍜 陪小魚吃拉麵 ({loveHearts})
          </button>
        </div>

        <button className="button button-primary love-close-btn" onClick={onClose}>
          好耶，出發吃拉麵！🍜
        </button>
      </div>
    </div>
  );
}
