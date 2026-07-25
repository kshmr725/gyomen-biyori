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
            d="M 160 120 C 150 90, 175 70, 165 40"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="4"
            strokeLinecap="round"
            className="steam-path path-1"
          />
          <path
            d="M 200 115 C 190 80, 215 60, 205 30"
            stroke="rgba(255, 255, 255, 0.95)"
            strokeWidth="5"
            strokeLinecap="round"
            className="steam-path path-2"
          />
          <path
            d="M 240 120 C 230 90, 255 70, 245 40"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="4"
            strokeLinecap="round"
            className="steam-path path-3"
          />
        </g>

        {/* Master Ceramic Ramen Bowl Group */}
        <g className="ramen-master-group">
          {/* Nori Seaweed Sheet */}
          <rect
            x="245"
            y="110"
            width="40"
            height="70"
            rx="4"
            transform="rotate(18 245 110)"
            fill="#1B2620"
            stroke="#111A15"
            strokeWidth="2"
          />

          {/* Bamboo Shoots (Menma) */}
          <rect x="135" y="145" width="28" height="8" rx="2" fill="#D4AC0D" transform="rotate(-8 135 145)" />
          <rect x="140" y="152" width="30" height="8" rx="2" fill="#B7950B" transform="rotate(-5 140 152)" />

          {/* Seared Chashu Pork Belly Slices */}
          <g transform="rotate(-15 220 155)">
            <ellipse cx="220" cy="155" rx="35" ry="24" fill="#A04000" stroke="#6E2C00" strokeWidth="2" />
            <ellipse cx="220" cy="155" rx="25" ry="16" fill="#D35400" />
            <path d="M 200 155 Q 220 162 240 155" stroke="#F5CBA7" strokeWidth="3" fill="none" />
            <line x1="205" y1="148" x2="235" y2="162" stroke="#5D4037" strokeWidth="2" opacity="0.6" />
          </g>

          {/* Silky Wavy Ramen Noodle Loops */}
          <g className="noodle-waves">
            <path d="M 130 165 Q 160 150 190 165 T 250 165 T 280 165" stroke="#F4D03F" strokeWidth="6" strokeLinecap="round" />
            <path d="M 125 175 Q 155 160 185 175 T 245 175 T 275 175" stroke="#F4D03F" strokeWidth="5.5" strokeLinecap="round" />
            <path d="M 135 185 Q 165 170 195 185 T 255 185" stroke="#F5B041" strokeWidth="5" strokeLinecap="round" />
          </g>

          {/* Ajitsuke Tamago (Half-Boiled Soft Egg) */}
          <g transform="rotate(12 165 175)">
            <ellipse cx="165" cy="175" rx="22" ry="17" fill="#FFFFFF" stroke="#E5E7E9" strokeWidth="1" />
            <ellipse cx="165" cy="175" rx="12" ry="9" fill="#F39C12" />
            <ellipse cx="163" cy="173" rx="4" ry="3" fill="#F1C40F" />
          </g>

          {/* ICONIC NARUTOMAKI (魚板 - Authentic Japanese Ramen Fish Cake) */}
          <g className="narutomaki-group" transform="rotate(-8 200 185)">
            <ellipse cx="200" cy="185" rx="18" ry="14" fill="#FFFFFF" stroke="#E5E7E9" strokeWidth="1.5" />
            {/* Red/Pink Spiral */}
            <path
              d="M 200 185 C 195 183, 194 179, 198 177 C 204 175, 208 181, 205 187 C 200 192, 190 187, 193 179"
              stroke="#E74C3C"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* Fresh Chopped Green Scallion Dots */}
          <circle cx="150" cy="165" r="3" fill="#27AE60" />
          <circle cx="185" cy="160" r="3" fill="#2ECC71" />
          <circle cx="215" cy="170" r="2.5" fill="#27AE60" />
          <circle cx="178" cy="195" r="3" fill="#2ECC71" />

          {/* Rich Dark Tonkotsu Broth Surface */}
          <ellipse cx="200" cy="180" rx="105" ry="32" fill="#D35400" opacity="0.9" />

          {/* Deep Blue Japanese Ceramic Bowl Rim with Raimon Pattern Accent */}
          <ellipse cx="200" cy="176" rx="112" ry="36" fill="#1B365D" stroke="#0E2342" strokeWidth="5" />
          <ellipse cx="200" cy="176" rx="106" ry="31" stroke="#E67E22" strokeWidth="2" fill="none" />

          {/* Deep Blue Ceramic Bowl Body */}
          <path
            d="M 88 176 C 100 285, 300 285, 312 176 Z"
            fill="#1B365D"
            stroke="#0E2342"
            strokeWidth="5"
          />

          {/* Japanese Ceramic Base Foot */}
          <ellipse cx="200" cy="272" rx="55" ry="12" fill="#0E2342" />

          {/* Wooden Chopsticks resting naturally across top */}
          <line x1="90" y1="150" x2="325" y2="135" stroke="#8D6E63" strokeWidth="5" strokeLinecap="round" />
          <line x1="90" y1="158" x2="325" y2="143" stroke="#6D4C41" strokeWidth="5" strokeLinecap="round" />
        </g>

        {/* Natural Fish Symbol Swimming Gently Beside the Bowl (NO spinning in circles!) */}
        <g className="natural-swimming-fish">
          {/* Subtle Water Ripple Ring */}
          <circle cx="320" cy="260" r="28" stroke="rgba(230, 81, 0, 0.25)" strokeWidth="1.5" className="fish-ripple" />
          
          {/* Elegant Natural Swimming Koi Silhouette */}
          <g className="fish-body-natural">
            <path
              d="M 335 255 C 320 245, 300 255, 310 270 C 322 280, 338 270, 338 258 Z"
              fill="#E65100"
            />
            {/* White belly curve */}
            <path
              d="M 330 257 C 320 250, 308 260, 315 272 C 324 275, 333 267, 332 259 Z"
              fill="#FFFFFF"
              opacity="0.8"
            />
            {/* Natural Tail Fin Wag */}
            <path
              d="M 306 270 C 292 278, 288 265, 284 282 C 296 276, 302 284, 310 272 Z"
              fill="#EF6C00"
              className="natural-tail-wag"
            />
            <circle cx="332" cy="258" r="2" fill="#1B2620" />
          </g>
        </g>
      </svg>
    </div>
  );
}
