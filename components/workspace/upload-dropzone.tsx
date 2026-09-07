"use client"

import { useRef, useState, type ChangeEvent, type DragEvent } from "react"
import Image from "next/image"
import { Upload, FlaskConical, Loader2, X, AlertTriangle } from "lucide-react"

type ExploreResult = {
  ok: boolean
  provider: string
  exploratory: boolean
  unavailable?: boolean
  answer: string
}

const MAX_BYTES = 8 * 1024 * 1024 // 8 MB

/**
 * Functional "bring your own imagery" flow. Uploaded images run through the
 * exploratory (non-grounded) /api/explore path — deliberately separate from the
 * curated-scene grounding pipeline — and results are labeled as exploratory.
 */
export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [question, setQuestion] = useState("")
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExploreResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const readFile = (file: File) => {
    setError(null)
    setResult(null)
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.")
      return
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large (max 8 MB).")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setDataUrl(typeof reader.result === "string" ? reader.result : null)
      setFileName(file.name)
    }
    reader.onerror = () => setError("Could not read that file.")
    reader.readAsDataURL(file)
  }

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) readFile(file)
  }

  const clear = () => {
    setDataUrl(null)
    setFileName("")
    setQuestion("")
    setResult(null)
    setError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const analyze = async () => {
    if (!dataUrl) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl, query: question }),
      })
      const json = (await res.json()) as ExploreResult & { error?: string }
      if (!res.ok || json.ok === false) {
        setError(json.error ?? "Analysis failed. Please try again.")
      } else {
        setResult(json)
      }
    } catch (err) {
      console.log("[v0] explore request failed:", (err as Error)?.message)
      setError("The exploratory service is unreachable. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-muted-2">Your imagery</h2>

      {!dataUrl ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`glass flex flex-col items-center gap-2 rounded-2xl border border-dashed p-5 text-center transition-colors ${
            dragging ? "border-brand-cyan/60 bg-brand-cyan/5" : "border-white/12"
          }`}
        >
          <Upload className="h-5 w-5 text-muted-2" />
          <p className="text-xs text-muted">Drag an image here, or</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="glass glass-hover rounded-lg px-3 py-1.5 text-xs font-medium text-foreground"
          >
            Choose file
          </button>
          <p className="text-[11px] leading-snug text-muted-2">
            Uploads run an exploratory analysis — results are tagged{" "}
            <span className="text-warning">not scene-verified</span>.
          </p>
          <input ref={inputRef} type="file" accept="image/*" onChange={onInput} className="sr-only" aria-label="Upload image" />
        </div>
      ) : (
        <div className="glass rounded-2xl p-3">
          <div className="relative overflow-hidden rounded-xl">
            <div className="relative aspect-video w-full">
              <Image src={dataUrl || "/placeholder.svg"} alt={fileName || "Uploaded image"} fill sizes="360px" className="object-cover" unoptimized />
            </div>
            <button
              type="button"
              onClick={clear}
              className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#05050f]/70 text-muted hover:text-foreground"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229 && !loading) analyze()
            }}
            placeholder="Ask about this image (optional)…"
            className="mt-2.5 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-foreground placeholder:text-muted-2 focus:border-brand-cyan/50 focus:outline-none"
          />

          <button
            type="button"
            onClick={analyze}
            disabled={loading}
            className="brand-gradient-animated mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-[#05050f] transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
            {loading ? "Analyzing…" : "Run exploratory analysis"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-warning">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      {result && (
        <div className="glass mt-2.5 rounded-2xl border border-warning/25 p-3">
          <div className="mb-1.5 flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5 text-warning" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-warning">
              Exploratory · not scene-verified
            </span>
          </div>
          <p className="text-xs leading-relaxed text-foreground/90">{result.answer}</p>
          <p className="mt-2 border-t border-white/10 pt-2 font-mono text-[10px] text-muted-2">
            {result.unavailable
              ? "provider: offline · no grounding evidence"
              : `provider: ${result.provider} · ungrounded vision · low confidence`}
          </p>
        </div>
      )}
    </div>
  )
}
