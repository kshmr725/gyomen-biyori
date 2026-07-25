"use client";

export function BrandIcon({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-icon ${compact ? "brand-icon-compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 120 120" role="img" focusable="false">
        <g className="brand-steam">
          <path d="M42 30c-6-10 6-14 1-23" />
          <path d="M60 28c-6-10 6-14 1-23" />
          <path d="M78 30c-6-10 6-14 1-23" />
        </g>
        <ellipse cx="58" cy="60" rx="38" ry="13" className="brand-soup" />
        <path d="M20 60c4 35 72 35 76 0Z" className="brand-bowl" />
        <ellipse cx="58" cy="60" rx="38" ry="13" className="brand-rim" />
        <path d="M34 58q12-12 24 0t24 0" className="brand-noodle" />
        <ellipse cx="48" cy="63" rx="10" ry="7" className="brand-egg-white" />
        <ellipse cx="48" cy="63" rx="5" ry="3.5" className="brand-egg-yolk" />
        <g className="brand-fish">
          <path d="M101 80c-8-7-18-4-19 4 2 9 13 11 20 4l8 5-2-10 5-8-12 5Z" className="brand-fish-body" />
          <circle cx="98" cy="82" r="1.7" className="brand-fish-eye" />
        </g>
      </svg>
    </span>
  );
}
