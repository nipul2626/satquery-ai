/**
 * Descriptive registry of the public remote-sensing datasets and benchmarks
 * whose TASK STRUCTURE inspired this demo. None of this imagery is used or
 * redistributed here — the curated scenes are synthetic demonstration assets.
 *
 * The ISRO/SAC entry is explicitly a hidden official evaluation set this build
 * does NOT and CANNOT touch. It is listed for honest context only.
 */
export type ProvenanceStatus = "public" | "hidden" | "synthetic"

export type BenchmarkEntry = {
  id: string
  name: string
  citation?: string
  purpose: string
  task: string
  modality: string
  source: string
  sourceUrl?: string
  status: ProvenanceStatus
  statusNote: string
}

export const BENCHMARKS: BenchmarkEntry[] = [
  {
    id: "bigearthnet",
    name: "BigEarthNet",
    purpose: "Large-scale multi-label land-cover understanding.",
    task: "Multi-label scene classification",
    modality: "Sentinel-1 SAR + Sentinel-2 optical",
    source: "BigEarthNet (Sentinel-1/2 patches)",
    status: "public",
    statusNote: "Public benchmark — inspires this build's land-cover framing only; no patches are used here.",
  },
  {
    id: "vrsbench",
    name: "VRSBench",
    citation: "Li, Ding & Elhoseiny, NeurIPS 2024, arXiv:2406.12384",
    purpose: "Versatile vision-language understanding of remote-sensing imagery.",
    task: "Captioning · visual grounding · VQA",
    modality: "Optical (RGB)",
    source: "VRSBench (Li, Ding & Elhoseiny, NeurIPS 2024)",
    sourceUrl: "https://arxiv.org/abs/2406.12384",
    status: "public",
    statusNote: "Public benchmark — task structure reference for caption / grounding / VQA specialists.",
  },
  {
    id: "rsvqa",
    name: "RSVQA",
    citation: "Lobry, Marcos, Murray & Tuia, IEEE TGRS 58(12), 2020",
    purpose: "Natural-language question answering over satellite imagery.",
    task: "Visual Question Answering",
    modality: "Optical (RGB)",
    source: "RSVQA (Lobry et al., IEEE TGRS 2020)",
    status: "public",
    statusNote: "Public benchmark — reference for the Visual QA specialist's question style.",
  },
  {
    id: "cdvqa",
    name: "CDVQA",
    citation: "Yuan, Mou, Xiong & Zhu, IEEE TGRS 60, 2022",
    purpose: "Question answering about changes between bi-temporal image pairs.",
    task: "Change-detection VQA",
    modality: "Bi-temporal optical (RGB)",
    source: "CDVQA (Yuan et al., IEEE TGRS 2022)",
    status: "public",
    statusNote: "Public benchmark — reference for the Change Detection specialist's bi-temporal framing.",
  },
  {
    id: "lroc",
    name: "LROC (LRO Camera)",
    purpose: "High-resolution lunar surface mapping and crater characterization.",
    task: "Captioning · crater detection · visual grounding",
    modality: "Orbital optical (panchromatic NAC / WAC)",
    source: "NASA / ASU Lunar Reconnaissance Orbiter Camera",
    sourceUrl: "https://www.lroc.asu.edu/",
    status: "public",
    statusNote:
      "Public imagery archive — inspires the lunar caption / VQA / grounding scene framing only; no LROC frames are used or redistributed here.",
  },
  {
    id: "ch2-dfsar",
    name: "Chandrayaan-2 DFSAR",
    purpose: "Dual-frequency SAR search for water ice in permanently shadowed polar craters.",
    task: "Optical + SAR fusion · polar ice detection",
    modality: "L- and S-band SAR (with CPR analysis)",
    source: "ISRO Chandrayaan-2 Dual-Frequency SAR mission science",
    status: "public",
    statusNote:
      "Publicly documented mission science — inspires the lunar south-pole fusion scene. This is distinct from and unrelated to the hidden ISRO/SAC evaluation set below, and no mission data is used here.",
  },
  {
    id: "isro-sac",
    name: "ISRO / SAC evaluation set",
    purpose: "Official hidden evaluation of remote-sensing reasoning.",
    task: "Hidden held-out evaluation",
    modality: "Not disclosed to this build",
    source: "ISRO / Space Applications Centre",
    status: "hidden",
    statusNote:
      "Hidden official evaluation set — NOT accessible to this build. Listed as descriptive reference only; no ISRO/SAC, Cartosat-2S or RISAT data is used, touched, or represented anywhere in this demo.",
  },
]

export function getBenchmark(id: string): BenchmarkEntry | undefined {
  return BENCHMARKS.find((b) => b.id === id)
}
