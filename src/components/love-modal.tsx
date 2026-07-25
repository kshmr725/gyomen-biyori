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
          <span>🐟❤️ SPECIAL EASTER EGG FOR FISH</span>
        </div>

        <h2 className="love-title">這是我做給小魚的專屬愛意</h2>

        <div className="love-message-box">
          <p className="love-paragraph">
            這座「魚麵日和」拉麵地圖的每一行程式碼、每一次捷運路線計算、每一個介面細節，都是我為你用心量身打造的。
          </p>
          <p className="love-paragraph highlight">
            願陪你吃遍台北、日本與世界上的每一碗拉麵 🍜❤️
          </p>
        </div>

        <div className="love-counter-box">
          <button
            className="love-heart-btn"
            onClick={() => setLoveHearts((prev) => prev + 1)}
          >
            💖 點擊送出愛意 ({loveHearts})
          </button>
        </div>

        <button className="button button-primary love-close-btn" onClick={onClose}>
          收下愛意 ❤️
        </button>
      </div>
    </div>
  );
}
