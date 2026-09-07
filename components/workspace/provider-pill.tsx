import type { ProviderId } from "@/lib/types"

const META: Record<
    ProviderId,
    {
        label: string
        dot: string
        text: string
    }
> = {
    groq: {
        label: "Qwen 3.6 27B · Groq",
        dot: "#22d3ee",
        text: "text-brand-cyan",
    },

    gemini: {
        label: "Gemini 3.6 Flash",
        dot: "#a855f7",
        text: "text-brand-violet",
    },

    offline: {
        label: "Offline fallback",
        dot: "#fbbf24",
        text: "text-warning",
    },
}

export function ProviderPill({
                                 provider,
                                 pending,
                             }: {
    provider: ProviderId | null
    pending?: boolean
}) {
    if (!provider) {
        return (
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted">
        <span
            className={`h-2 w-2 rounded-full ${
                pending
                    ? "animate-pulse bg-brand-cyan"
                    : "bg-muted-2"
            }`}
        />

                {pending
                    ? "Selecting provider…"
                    : "Idle"}
      </span>
        )
    }

    const meta = META[provider]

    return (
        <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
      <span
          className="h-2 w-2 rounded-full"
          style={{
              backgroundColor:
              meta.dot,
              boxShadow: `0 0 8px ${meta.dot}`,
          }}
      />

      <span className="text-muted">
        served by
      </span>

      <span
          className={`font-medium ${meta.text}`}
      >
        {meta.label}
      </span>
    </span>
    )
}