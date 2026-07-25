"use client";

export function HeroArt() {
  return (
    <div className="hero-art-container" aria-hidden="true">
      {/* Background Japanese Zen Sun Disc */}
      <div className="zen-sun-disc" />

      {/* Unified Master Vector Artwork (Ramen Bowl + Swimming Koi + Rising Steam) */}
      <svg
        className="hero-master-svg"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Steam Vapors Rising */}
        <g className="steam-group">
          <path
            d="M 160 140 C 150 110, 175 90, 165 60"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth="4"
            strokeLinecap="round"
            className="steam-path path-1"
          />
          <path
            d="M 200 135 C 190 100, 215 80, 205 50"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="5"
            strokeLinecap="round"
            className="steam-path path-2"
          />
          <path
            d="M 240 140 C 230 110, 255 90, 245 60"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth="4"
            strokeLinecap="round"
            className="steam-path path-3"
          />
        </g>

        {/* Outer Orbit Swimming Koi Fish */}
        <g className="koi-swimming-orbit">
          {/* Water Ripple Effect */}
          <ellipse
            cx="200"
            cy="270"
            rx="140"
            ry="45"
            stroke="rgba(255, 255, 255, 0.35)"
            strokeWidth="2"
            strokeDasharray="6 6"
            className="orbit-ripple"
          />

          {/* Elegant Koi Body */}
          <g className="koi-fish-vector">
            {/* Fish Body */}
            <path
              d="M 120 180 C 90 160, 60 190, 75 220 C 95 245, 130 230, 135 200 Z"
              fill="#E65100"
              opacity="0.9"
            />
            {/* White belly accent */}
            <path
              d="M 110 185 C 90 175, 75 195, 85 215 C 100 230, 120 220, 125 195 Z"
              fill="#FFFFFF"
              opacity="0.75"
            />
            {/* Tail Fin with smooth wagging */}
            <path
              d="M 65 215 C 45 225, 35 210, 30 235 C 45 230, 55 240, 72 225 Z"
              fill="#EF6C00"
              className="koi-tail-fin"
            />
            {/* Eye */}
            <circle cx="124" cy="192" r="2.5" fill="#263238" />
          </g>
        </g>

        {/* Minimalist Ceramic Ramen Bowl */}
        <g className="ramen-bowl-group">
          {/* Nori Seaweed Sheet */}
          <rect
            x="240"
            y="145"
            width="32"
            height="55"
            rx="4"
            transform="rotate(15 240 145)"
            fill="#2D3B36"
          />

          {/* Noodle Loops */}
          <path
            d="M 140 185 Q 170 170 200 185 T 260 185"
            stroke="#F5B041"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M 145 195 Q 175 180 205 195 T 255 195"
            stroke="#F5B041"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Ajitsuke Tamago (Half-Boiled Soft Egg) */}
          <ellipse cx="170" cy="188" rx="18" ry="14" fill="#FFFFFF" transform="rotate(-10 170 188)" />
          <ellipse cx="170" cy="188" rx="9" ry="7" fill="#F39C12" transform="rotate(-10 170 188)" />

          {/* Bowl Rim */}
          <ellipse cx="200" cy="190" rx="100" ry="28" fill="#2E4A3E" stroke="#1B332A" strokeWidth="4" />
          {/* Rich Golden Broth Inner Surface */}
          <ellipse cx="200" cy="192" rx="94" ry="22" fill="#D35400" opacity="0.85" />

          {/* Ceramic Bowl Body */}
          <path
            d="M 100 190 C 110 280, 290 280, 300 190 Z"
            fill="#2E4A3E"
            stroke="#1B332A"
            strokeWidth="4"
          />

          {/* Japanese Terracotta Accent Lines */}
          <path
            d="M 130 220 Q 200 245 270 220"
            stroke="#C0392B"
            strokeWidth="3"
            fill="none"
          />

          {/* Wooden Chopsticks resting across bowl */}
          <line x1="110" y1="170" x2="310" y2="155" stroke="#8D6E63" strokeWidth="4" strokeLinecap="round" />
          <line x1="110" y1="176" x2="310" y2="161" stroke="#6D4C41" strokeWidth="4" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
