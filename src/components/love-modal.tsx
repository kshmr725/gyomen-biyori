"use client";

import { useState } from "react";

type LoveModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

interface Particle {
  id: number;
  x: number;
  y: number;
  icon: string;
  vx: number;
}

const RAMEN_ICONS = ["🍜", "🍥", "🥢", "✨", "💖", "😋", "🏮", "🥚"];

export function LoveModal({ isOpen, onClose }: LoveModalProps) {
  const [loveHearts, setLoveHearts] = useState(520);
  const [particles, setParticles] = useState<Particle[]>([]);

  if (!isOpen) return null;

  function handleRamenClick(e: React.MouseEvent<HTMLButtonElement>) {
    setLoveHearts((prev) => prev + 1);

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Spawn 5 flying ramen particles on click
    const newParticles: Particle[] = Array.from({ length: 5 }).map((_, index) => ({
      id: Date.now() + Math.random() + index,
      x: clickX + (Math.random() * 60 - 30),
      y: clickY,
      icon: RAMEN_ICONS[Math.floor(Math.random() * RAMEN_ICONS.length)],
      vx: Math.random() * 80 - 40,
    }));

    setParticles((prev) => [...prev.slice(-25), ...newParticles]);

    // Automatically clean up after animation
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
    }, 1200);
  }

  return (
    <div className="love-modal-overlay" onClick={onClose}>
      <div className="love-modal-content paper-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>

        <div className="love-header-badge warm-badge">
          <span>🐟🍜 SPECIAL EDITION FOR LITTLE FISH</span>
        </div>

        <h2 className="love-title">小魚專屬拉麵美食指南</h2>

        <div className="love-message-box warm-box">
          <p className="love-paragraph">
            這座「魚麵日和」地圖，是用來記錄我們一起吃拉麵的點點滴滴。地點選好了，剩下的就交給我！
          </p>
          <p className="love-paragraph highlight warm-highlight">
            希望陪妳吃遍台北、日本與世界上的每一碗美味拉麵 🍜✨
          </p>
        </div>

        <div className="love-counter-box">
          <button className="love-heart-btn warm-ramen-btn" onClick={handleRamenClick}>
            🍜 陪小魚吃拉麵 ({loveHearts})
            {/* Flying Ramen Particles */}
            {particles.map((p) => (
              <span
                key={p.id}
                className="flying-ramen-particle"
                style={{
                  left: `${p.x}px`,
                  top: `${p.y}px`,
                  "--vx": `${p.vx}px`,
                } as React.CSSProperties}
              >
                {p.icon}
              </span>
            ))}
          </button>
        </div>

        <button className="button button-primary love-close-btn warm-main-btn" onClick={onClose}>
          好耶，出發吃拉麵！🍜
        </button>
      </div>
    </div>
  );
}
