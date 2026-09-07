export function Logo({ className = "", size = 32 }: { className?: string; size?: number }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#22d3ee" />
            <stop offset="0.5" stopColor="#a855f7" />
            <stop offset="1" stopColor="#e879f9" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="13" stroke="url(#logo-grad)" strokeWidth="1.5" opacity="0.35" />
        <circle cx="16" cy="16" r="8.5" stroke="url(#logo-grad)" strokeWidth="1.5" opacity="0.6" />
        <circle cx="16" cy="16" r="3" fill="url(#logo-grad)" />
        <path d="M16 3 L16 8" stroke="url(#logo-grad)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M29 16 L24 16" stroke="url(#logo-grad)" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="3" r="1.6" fill="#22d3ee" />
        <circle cx="27" cy="24" r="1.4" fill="#e879f9" />
      </svg>
      <span className="font-display text-lg font-bold tracking-tight">
        Sat<span className="brand-text">Query</span>
      </span>
    </span>
  )
}
