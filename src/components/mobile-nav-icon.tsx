type MobileNavIconProps = {
  type: "choose" | "explore" | "profile";
};

export function MobileNavIcon({ type }: MobileNavIconProps) {
  if (type === "choose") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M7 14h18c-.8 7.2-4.1 11-9 11s-8.2-3.8-9-11Z" className="cis-icon-fill" />
        <path d="M6 13.5h20M10 10.5c1.3-2 2.7-2 4 0s2.7 2 4 0 2.7-2 4 0" className="cis-icon-stroke" />
        <path d="M22.5 22.5c2.7 0 4.5 1 5.5 3-2.8.2-4.8-.4-6-1.8" className="cis-icon-accent" />
      </svg>
    );
  }

  if (type === "explore") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M16 27s8-7.1 8-14a8 8 0 1 0-16 0c0 6.9 8 14 8 14Z" className="cis-icon-stroke" />
        <circle cx="16" cy="13" r="3.3" className="cis-icon-accent-fill" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="8" y="5" width="16" height="22" rx="2.5" className="cis-icon-stroke" />
      <path d="M12 11h8M12 16h8M12 21h5" className="cis-icon-stroke" />
      <path d="M22.5 20.5c2.4 0 4 1 4.8 3-2.5.2-4.3-.4-5.3-1.7" className="cis-icon-accent" />
    </svg>
  );
}
