import Image from "next/image"

export function Logo({
                         className = "",
                         size = 32,
                     }: {
    className?: string
    size?: number
}) {
    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
          src="/satquery-logo.png"
          alt="SatQuery AI"
          width={size}
          height={size}
          priority
          className="shrink-0 object-contain"
      />

      <span className="font-display text-lg font-bold tracking-tight">
        Sat<span className="brand-text">Query</span>
      </span>
    </span>
    )
}