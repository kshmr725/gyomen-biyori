"use client";

export function HeroArt() {
  return (
    <div className="hero-art-container" aria-hidden="true">
      {/* Background Soft Japanese Sun Glow */}
      <div className="zen-sun-disc" />

      {/* Mouth-Watering Vector Artwork: Authentic Japanese Ramen Bowl + Narutomaki Fish Cake + Natural Swimming Fish */}
      <svg
        className="hero-master-svg"
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Organic Rising Steam Vapors */}
        <g className="steam-group">
          <path
            d="M 160 110 C 150 80, 175 60, 165 30"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="4"
            strokeLinecap="round"
            className="steam-path path-1"
          />
          <path
            d="M 200 100 C 190 70, 215 50, 205 20"
            stroke="rgba(255, 255, 255, 0.95)"
            strokeWidth="5"
            strokeLinecap="round"
            className="steam-path path-2"
          />
          <path
            d="M 240 110 C 230 80, 255 60, 245 30"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="4"
            strokeLinecap="round"
            className="steam-path path-3"
          />
        </g>

        {/* --- LAYER 1: BOWL BASE & SOUP SURFACE (Bottom Layer) --- */}
        {/* Deep Ceramic Bowl Body */}
        <path
          d="M 80 180 C 95 300, 305 300, 320 180 Z"
          fill="#1B365D"
          stroke="#0E2342"
          strokeWidth="6"
        />

        {/* Ceramic Foot Ring */}
        <ellipse cx="200" cy="285" rx="60" ry="14" fill="#0E2342" />

        {/* Bowl Rim Back Fill */}
        <ellipse cx="200" cy="180" rx="120" ry="38" fill="#1B365D" stroke="#0E2342" strokeWidth="4" />

        {/* Rich Golden-Red Tonkotsu Broth Soup Surface */}
        <ellipse cx="200" cy="182" rx="112" ry="32" fill="#D35400" />
        {/* Inner Oil Layer Glow */}
        <ellipse cx="200" cy="184" rx="100" ry="26" fill="#E67E22" opacity="0.8" />


        {/* --- LAYER 2: ALL RAMEN TOPPING INGREDIENTS (Drawn ON TOP of soup so 100% visible!) --- */}

        {/* 1. Nori Seaweed Sheet (Standing up on the back-left) */}
        <rect
          x="115"
          y="105"
          width="48"
          height="80"
          rx="6"
          transform="rotate(-20 115 105)"
          fill="#1B2620"
          stroke="#0E1713"
          strokeWidth="3"
        />

        {/* 2. Silky Yellow Noodle Waves */}
        <g className="noodle-waves">
          <path d="M 125 175 Q 160 155 195 175 T 265 175 T 290 175" stroke="#F4D03F" strokeWidth="7" strokeLinecap="round" />
          <path d="M 135 188 Q 170 168 205 188 T 275 188" stroke="#F4D03F" strokeWidth="6.5" strokeLinecap="round" />
          <path d="M 140 198 Q 175 178 210 198 T 270 198" stroke="#F5B041" strokeWidth="6" strokeLinecap="round" />
        </g>

        {/* 3. Bamboo Shoots (Menma) */}
        <rect x="130" y="160" width="34" height="10" rx="3" fill="#D4AC0D" transform="rotate(-12 130 160)" stroke="#B7950B" strokeWidth="1.5" />
        <rect x="138" y="168" width="36" height="10" rx="3" fill="#B7950B" transform="rotate(-8 138 168)" stroke="#9A7D0A" strokeWidth="1.5" />

        {/* 4. Seared Chashu Pork Belly Slice (Large & Prominent) */}
        <g transform="rotate(-12 245 165)">
          <ellipse cx="245" cy="165" rx="42" ry="28" fill="#A04000" stroke="#6E2C00" strokeWidth="3" />
          <ellipse cx="245" cy="165" rx="30" ry="18" fill="#D35400" />
          <path d="M 215 165 Q 245 174 275 165" stroke="#F5CBA7" strokeWidth="4" fill="none" />
          {/* Seared Grill Marks */}
          <line x1="220" y1="155" x2="260" y2="175" stroke="#421B00" strokeWidth="2.5" opacity="0.6" />
          <line x1="230" y1="150" x2="270" y2="170" stroke="#421B00" strokeWidth="2.5" opacity="0.6" />
        </g>

        {/* 5. Ajitsuke Tamago (Half-Boiled Soft Egg with Golden Yolk) */}
        <g transform="rotate(10 175 195)">
          <ellipse cx="175" cy="195" rx="28" ry="20" fill="#FFFFFF" stroke="#BDC3C7" strokeWidth="2" />
          <ellipse cx="175" cy="195" rx="16" ry="11" fill="#F39C12" />
          <ellipse cx="172" cy="192" rx="6" ry="4" fill="#F1C40F" />
        </g>

        {/* 6. ICONIC NARUTOMAKI (魚板 - White Fish Cake with Pink Spiral) */}
        <g className="narutomaki-group" transform="rotate(-6 220 205)">
          <ellipse cx="220" cy="205" rx="24" ry="18" fill="#FFFFFF" stroke="#E5E7E9" strokeWidth="2" />
          {/* Pink/Red Swirl */}
          <path
            d="M 220 205 C 213 202, 212 196, 218 193 C 227 189, 234 198, 229 208 C 220 216, 206 208, 210 196"
            stroke="#E74C3C"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* 7. Fresh Chopped Scallions (蔥花) */}
        <circle cx="150" cy="180" r="4" fill="#27AE60" stroke="#1E8449" strokeWidth="1" />
        <circle cx="195" cy="170" r="4" fill="#2ECC71" stroke="#27AE60" strokeWidth="1" />
        <circle cx="230" cy="185" r="3.5" fill="#27AE60" />
        <circle cx="190" cy="210" r="4" fill="#2ECC71" stroke="#27AE60" strokeWidth="1" />


        {/* --- LAYER 3: BOWL FRONT LIP & CHOPSTICKS --- */}
        {/* Bowl Rim Front Stroke (Transparent center so toppings show through 100%!) */}
        <ellipse cx="200" cy="180" rx="120" ry="38" fill="none" stroke="#0E2342" strokeWidth="6" />

        {/* Wooden Chopsticks resting across top */}
        <line x1="75" y1="150" x2="335" y2="135" stroke="#8D6E63" strokeWidth="6" strokeLinecap="round" />
        <line x1="75" y1="159" x2="335" y2="144" stroke="#6D4C41" strokeWidth="6" strokeLinecap="round" />


        {/* --- LAYER 4: NATURAL SWIMMING FISH (Bright & Gentle beside the bowl) --- */}
        <g className="natural-swimming-fish">
          {/* Water Ripple Ring */}
          <circle cx="320" cy="270" r="30" stroke="rgba(230, 81, 0, 0.3)" strokeWidth="2" className="fish-ripple" />
          
          {/* Bright Orange Swimming Fish */}
          <g className="fish-body-natural">
            <path
              d="M 338 265 C 322 253, 300 265, 310 282 C 324 294, 342 282, 342 268 Z"
              fill="#E65100"
            />
            {/* White belly curve */}
            <path
              d="M 332 267 C 320 258, 306 270, 314 284 C 325 288, 335 278, 334 269 Z"
              fill="#FFFFFF"
              opacity="0.85"
            />
            {/* Tail Fin */}
            <path
              d="M 306 282 C 290 292, 286 276, 280 296 C 294 288, 300 298, 310 284 Z"
              fill="#EF6C00"
              className="natural-tail-wag"
            />
            <circle cx="335" cy="268" r="2.5" fill="#1B2620" />
          </g>
        </g>
      </svg>
    </div>
  );
}
