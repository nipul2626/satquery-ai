"use client"

import { useState } from "react"
import { TopBar } from "./top-bar"
import { SceneGallery } from "./scene-gallery"
import { SceneInspector } from "./scene-inspector"
import { SpecialistStrip } from "./specialist-strip"
import { ImageViewer } from "./image-viewer"
import { QueryConsole } from "./query-console"
import { ExecutionTrace } from "./execution-trace"
import { AnswerCard } from "./answer-card"
import { HistoryList } from "./history-list"
import { UploadDropzone } from "./upload-dropzone"
import { BenchmarksDialog } from "./benchmarks-dialog"

export function Workspace() {
  const [benchmarksOpen, setBenchmarksOpen] = useState(false)

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 p-3 sm:p-4">
      <TopBar onOpenBenchmarks={() => setBenchmarksOpen(true)} />

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_400px]">
        {/* Left pane */}
        <aside className="scroll-thin flex flex-col gap-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <SceneGallery />
          <SpecialistStrip />
          <SceneInspector />
          <UploadDropzone />
        </aside>

        {/* Center pane */}
        <section className="min-h-[360px] lg:max-h-[calc(100vh-6rem)]">
          <ImageViewer />
        </section>

        {/* Right pane */}
        <aside className="scroll-thin flex flex-col gap-5 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
          <QueryConsole />
          <ExecutionTrace />
          <AnswerCard />
          <HistoryList />
        </aside>
      </div>

      <BenchmarksDialog open={benchmarksOpen} onClose={() => setBenchmarksOpen(false)} />
    </div>
  )
}
