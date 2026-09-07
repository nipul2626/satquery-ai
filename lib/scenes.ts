import type { Scene } from "./types"

/**
 * Curated scene registry. Each scene ships a hand-authored EvidenceStore that
 * acts as the ground-truth the specialists are grounded against — synthesis is
 * only ever allowed to cite from here. Provenance is explicit and every scene
 * is labeled as a synthetic demonstration asset.
 */
export const SCENES: Scene[] = [
  {
    id: "coastal-urban",
    body: "earth",
    title: "Coastal Harbor City",
    subtitle: "Single optical · VQA, captioning & grounding",
    mode: "single",
    modality: "optical",
    images: { optical: "/scenes/urban-optical.png" },
    location: "Synthetic coastal metropolis (demo)",
    sensor: "Simulated optical (RGB, ~0.5 m)",
    captured: "Reference epoch T0",
    gsd: "~0.5 m/px (simulated)",
    provenance: {
      source: "Synthetic demonstration asset",
      license: "Demo use — generated imagery",
      synthetic: true,
      note: "Task structure modeled on public VQA / captioning / visual-grounding remote-sensing benchmarks (e.g. RSVQA, VRSBench). No real coordinates.",
    },
    suggestedQueries: [
      "Describe this scene.",
      "How many ships are in the harbor?",
      "Is there a bridge in this image?",
      "Point to the harbor water body.",
      "What is the dominant land cover?",
    ],
    availableIntents: ["caption", "vqa", "grounding"],
    evidence: {
      caption:
        "A dense coastal city occupies the eastern two-thirds of the frame, bordered on the west by a large sheltered harbor. A road bridge crosses the harbor mouth, several vessels are moored inside the basin, and a green urban park breaks up the built-up grid.",
      facts: [
        { q: "how many ships boats vessels", a: "There are 4 distinct vessels moored inside the harbor basin.", keywords: ["ship", "ships", "boat", "boats", "vessel", "vessels"] },
        { q: "bridge", a: "Yes — a single road bridge crosses the harbor mouth in the lower-left of the frame.", keywords: ["bridge", "crossing", "span"] },
        { q: "dominant land cover", a: "Built-up / impervious surface is dominant at ~54% of the scene.", keywords: ["land cover", "dominant", "coverage", "built"] },
        { q: "water body harbor", a: "A single large harbor water body covers the western portion of the scene (~24%).", keywords: ["water", "harbor", "harbour", "sea", "ocean", "port"] },
        { q: "park vegetation green", a: "One notable urban park plus scattered street vegetation account for ~15% green cover.", keywords: ["park", "vegetation", "green", "trees", "forest"] },
      ],
      objects: [
        { label: "Moored vessel", count: 4, bbox: { x: 0.09, y: 0.42, w: 0.24, h: 0.22 }, note: "Cluster of 4 vessels in the harbor basin" },
        {
          label: "Road bridge",
          count: 1,
          bbox: { x: 0.08, y: 0.74, w: 0.42, h: 0.12 },
          overlay: {
            type: "line",
            points: [
              { x: 0.08, y: 0.82 },
              { x: 0.16, y: 0.80 },
              { x: 0.25, y: 0.78 },
              { x: 0.34, y: 0.76 },
              { x: 0.43, y: 0.73 },
              { x: 0.49, y: 0.70 },
            ],
            strokeWidth: 1.8,
          },
        },
        { label: "Urban park", count: 1, bbox: { x: 0.55, y: 0.25, w: 0.18, h: 0.2 } },
      ],
      landCover: [
        { class: "Built-up", percent: 54, color: "#e879f9" },
        { class: "Water", percent: 24, color: "#22d3ee" },
        { class: "Vegetation", percent: 15, color: "#34d399" },
        { class: "Bare / roads", percent: 7, color: "#fbbf24" },
      ],
      regions: [
        { id: "harbor", label: "Harbor water body", synonyms: ["harbor", "harbour", "water", "port", "basin", "sea"], bbox: { x: 0.02, y: 0.18, w: 0.34, h: 0.6 } },
        { id: "downtown", label: "Dense downtown core", synonyms: ["downtown", "city", "buildings", "urban", "center", "built"], bbox: { x: 0.42, y: 0.3, w: 0.5, h: 0.5 } },
        { id: "park", label: "Urban park", synonyms: ["park", "green", "vegetation", "trees"], bbox: { x: 0.55, y: 0.25, w: 0.18, h: 0.2 } },
        {
          id: "bridge",
          label: "Road bridge",
          synonyms: ["bridge", "crossing", "span"],
          bbox: { x: 0.08, y: 0.74, w: 0.42, h: 0.12 },
          overlay: {
            type: "line",
            points: [
              { x: 0.08, y: 0.82 },
              { x: 0.16, y: 0.80 },
              { x: 0.25, y: 0.78 },
              { x: 0.34, y: 0.76 },
              { x: 0.43, y: 0.73 },
              { x: 0.49, y: 0.70 },
            ],
            strokeWidth: 1.8,
          },
        },
      ],
      baseConfidence: { caption: 0.9, vqa: 0.86, grounding: 0.82, change: 0.3, fusion: 0.3 },
    },
  },
  {
    id: "river-fusion",
    body: "earth",
    title: "River Valley — Optical + SAR",
    subtitle: "Sensor pair · multimodal fusion",
    mode: "pair",
    modality: "optical+sar",
    images: { optical: "/scenes/fusion-optical.png", sar: "/scenes/fusion-sar.png" },
    location: "Synthetic river valley (demo)",
    sensor: "Simulated optical (RGB) + simulated C-band SAR",
    captured: "Coincident acquisition",
    gsd: "~10 m/px (simulated)",
    provenance: {
      source: "Synthetic demonstration asset",
      license: "Demo use — generated imagery",
      synthetic: true,
      note: "Fusion task modeled on optical+SAR datasets (e.g. Sentinel-1/2 style pairing). SAR panel is a stylized backscatter rendering, not a calibrated product.",
    },
    suggestedQueries: [
      "Combine both sensors — what is the land use here?",
      "What does SAR reveal that optical misses?",
      "Delineate the built-up area using both sensors.",
      "Is the river reliably detected in both modalities?",
    ],
    availableIntents: ["fusion", "caption", "vqa", "grounding"],
    evidence: {
      caption:
        "A river valley with a diagonal channel separating agricultural fields to the west from a built-up settlement to the north-east. Optical shows crop patterns and haze; SAR resolves the built-up cluster as bright high-backscatter returns and the river as smooth dark low-backscatter.",
      facts: [
        { q: "land use", a: "Fusion suggests three classes: agriculture (west), built-up (north-east), and open water (the river channel).", keywords: ["land use", "land cover", "classes", "classification"] },
        { q: "sar reveal optical miss", a: "SAR sharply separates built-up (bright, double-bounce) from water (dark, specular) even under the optical haze, and is unaffected by cloud/illumination.", keywords: ["sar", "reveal", "miss", "advantage", "backscatter", "cloud", "haze"] },
        { q: "river both modalities", a: "Yes — the river is detected in both: dark smooth in SAR and blue-brown in optical. Agreement is high along the main channel.", keywords: ["river", "water", "both", "agree", "detect"] },
      ],
      objects: [
        { label: "Built-up cluster (SAR-bright)", count: 1, bbox: { x: 0.58, y: 0.12, w: 0.34, h: 0.3 }, note: "High SAR backscatter" },
        { label: "River channel", count: 1, bbox: { x: 0.2, y: 0.05, w: 0.5, h: 0.85 } },
      ],
      landCover: [
        { class: "Agriculture", percent: 46, color: "#34d399" },
        { class: "Built-up", percent: 27, color: "#e879f9" },
        { class: "Water", percent: 18, color: "#22d3ee" },
        { class: "Bare soil", percent: 9, color: "#fbbf24" },
      ],
      regions: [
        { id: "built", label: "Built-up area", synonyms: ["built", "urban", "settlement", "city", "buildings"], bbox: { x: 0.58, y: 0.12, w: 0.34, h: 0.3 } },
        { id: "river", label: "River channel", synonyms: ["river", "water", "channel", "stream"], bbox: { x: 0.2, y: 0.05, w: 0.5, h: 0.85 } },
        { id: "fields", label: "Agricultural fields", synonyms: ["field", "fields", "agriculture", "crops", "farm"], bbox: { x: 0.02, y: 0.2, w: 0.4, h: 0.6 } },
      ],
      fusionNotes: [
        "SAR is illumination- and weather-independent, so built-up and water boundaries stay crisp under the optical haze.",
        "Optical contributes spectral context (crop vigor, soil tone) that SAR cannot resolve.",
        "Agreement is highest on water; disagreement concentrates at field/built-up edges.",
      ],
      baseConfidence: { caption: 0.83, vqa: 0.8, grounding: 0.78, change: 0.3, fusion: 0.88 },
    },
  },
  {
    id: "delta-flood",
    body: "earth",
    title: "River Delta — Flood Event",
    subtitle: "Bitemporal · change detection",
    mode: "bitemporal",
    modality: "optical",
    images: { before: "/scenes/flood-before.png", after: "/scenes/flood-after.png" },
    location: "Synthetic river delta (demo)",
    sensor: "Simulated optical (RGB)",
    captured: "T0 (pre-event) → T1 (post-event)",
    gsd: "~10 m/px (simulated)",
    provenance: {
      source: "Synthetic demonstration asset",
      license: "Demo use — generated imagery",
      synthetic: true,
      note: "Change-detection task modeled on flood-mapping benchmarks. Deltas are authored for demonstration and do not represent a real event.",
    },
    suggestedQueries: [
      "What changed between the two dates?",
      "How much new water appeared?",
      "Which areas were flooded?",
      "Was the settlement affected?",
    ],
    availableIntents: ["change", "caption", "vqa"],
    evidence: {
      caption:
        "Between T0 and T1 the river burst its banks. Open water expands sharply across the eastern floodplain, inundating farmland and partially surrounding the settlement cluster near the channel.",
      facts: [
        { q: "what changed", a: "The dominant change is a large increase in open water on the eastern floodplain — roughly +31% surface water — submerging farmland.", keywords: ["change", "changed", "difference", "flood"] },
        { q: "how much new water", a: "New inundated area is ~31% of the scene, concentrated east of the original channel.", keywords: ["how much", "water", "area", "extent", "new"] },
        { q: "settlement affected", a: "Yes — the settlement cluster is now partially surrounded by floodwater on its eastern and southern edges.", keywords: ["settlement", "town", "village", "affected", "houses", "buildings"] },
      ],
      objects: [
        { label: "Settlement cluster", count: 1, bbox: { x: 0.34, y: 0.5, w: 0.16, h: 0.16 } },
      ],
      landCover: [
        { class: "Water (T1)", percent: 49, color: "#22d3ee" },
        { class: "Farmland", percent: 34, color: "#34d399" },
        { class: "Bare / mud", percent: 11, color: "#fbbf24" },
        { class: "Built-up", percent: 6, color: "#e879f9" },
      ],
      regions: [
        { id: "channel", label: "Original river channel", synonyms: ["river", "channel", "water"], bbox: { x: 0.28, y: 0.05, w: 0.14, h: 0.9 } },
        { id: "settlement", label: "Settlement cluster", synonyms: ["settlement", "town", "village", "houses", "buildings"], bbox: { x: 0.34, y: 0.5, w: 0.16, h: 0.16 } },
      ],
      changes: [
        { label: "New flood water (east floodplain)", bbox: { x: 0.5, y: 0.2, w: 0.45, h: 0.6 }, direction: "increase", deltaPercent: 31, note: "Farmland submerged east of the channel" },
        { label: "Widened river channel", bbox: { x: 0.26, y: 0.05, w: 0.2, h: 0.9 }, direction: "increase", deltaPercent: 8, note: "Main channel spilled laterally" },
        { label: "Lost farmland", bbox: { x: 0.55, y: 0.3, w: 0.35, h: 0.4 }, direction: "decrease", deltaPercent: 27, note: "Cropland replaced by water" },
      ],
      baseConfidence: { caption: 0.85, vqa: 0.82, grounding: 0.6, change: 0.89, fusion: 0.3 },
    },
  },
  {
    id: "urban-expansion",
    body: "earth",
    title: "Urban Fringe — Expansion",
    subtitle: "Bitemporal · change detection",
    mode: "bitemporal",
    modality: "optical",
    images: { before: "/scenes/urban-before.png", after: "/scenes/urban-after.png" },
    location: "Synthetic urban fringe (demo)",
    sensor: "Simulated optical (RGB)",
    captured: "T0 (earlier) → T1 (later)",
    gsd: "~1 m/px (simulated)",
    provenance: {
      source: "Synthetic demonstration asset",
      license: "Demo use — generated imagery",
      synthetic: true,
      note: "Urban-growth change task modeled on public building-change datasets (e.g. LEVIR-CD style). Authored deltas for demonstration only.",
    },
    suggestedQueries: [
      "Summarize the change between dates.",
      "How much new construction appeared?",
      "Where did the city expand?",
      "Did any green space remain?",
    ],
    availableIntents: ["change", "caption", "vqa"],
    evidence: {
      caption:
        "Between T0 and T1 the north-eastern fields were converted to dense development — new rooftops, a street grid and parking replace open land, while the main road and the original south-west cluster persist.",
      facts: [
        { q: "summarize change", a: "The main change is new urban development in the north-east: roughly +38% built-up area replacing former fields.", keywords: ["change", "summary", "summarize", "difference", "expand", "growth"] },
        { q: "how much new construction", a: "New construction covers about 38% of the scene, previously green/open land.", keywords: ["how much", "construction", "new", "built", "area"] },
        { q: "green space remain", a: "A narrow vegetation strip along the southern edge (~12%) remains undeveloped.", keywords: ["green", "vegetation", "remain", "park", "open"] },
      ],
      objects: [
        { label: "New development block", count: 1, bbox: { x: 0.52, y: 0.12, w: 0.4, h: 0.42 } },
      ],
      landCover: [
        { class: "Built-up (T1)", percent: 58, color: "#e879f9" },
        { class: "Vegetation", percent: 24, color: "#34d399" },
        { class: "Roads / bare", percent: 18, color: "#fbbf24" },
      ],
      regions: [
        { id: "road", label: "Main road", synonyms: ["road", "highway", "street"], bbox: { x: 0.0, y: 0.52, w: 1.0, h: 0.08 } },
        { id: "oldcluster", label: "Original cluster", synonyms: ["cluster", "old", "existing", "buildings"], bbox: { x: 0.05, y: 0.62, w: 0.22, h: 0.24 } },
      ],
      changes: [
        { label: "New development (NE fields)", bbox: { x: 0.52, y: 0.12, w: 0.4, h: 0.42 }, direction: "new", deltaPercent: 38, note: "Fields converted to rooftops and streets" },
        { label: "Lost farmland / open land", bbox: { x: 0.52, y: 0.12, w: 0.4, h: 0.42 }, direction: "decrease", deltaPercent: 34, note: "Open land consumed by construction" },
        { label: "New street grid", bbox: { x: 0.55, y: 0.4, w: 0.34, h: 0.16 }, direction: "new", deltaPercent: 9, note: "Access roads added" },
      ],
      baseConfidence: { caption: 0.86, vqa: 0.83, grounding: 0.62, change: 0.87, fusion: 0.3 },
    },
  },
  {
    id: "moon-highlands",
    body: "moon",
    title: "Lunar Highlands — Crater Field",
    subtitle: "Single optical · captioning, VQA & grounding",
    mode: "single",
    modality: "optical",
    images: { optical: "/scenes/moon-optical.png" },
    location: "Synthetic lunar highlands (demo)",
    sensor: "Simulated orbital optical (panchromatic)",
    captured: "Reference orbit pass",
    gsd: "~2 m/px (simulated)",
    provenance: {
      source: "Synthetic demonstration asset",
      license: "Demo use — generated imagery",
      synthetic: true,
      note: "Task structure inspired by LROC (Lunar Reconnaissance Orbiter Camera) crater-mapping imagery and lunar crater-detection literature. No real LROC frames or coordinates are used.",
    },
    suggestedQueries: [
      "Describe this lunar surface.",
      "How many large craters are visible?",
      "Point to the freshest crater with ejecta rays.",
      "What is the dominant surface material?",
    ],
    availableIntents: ["caption", "vqa", "grounding"],
    evidence: {
      caption:
        "A heavily cratered lunar highland surface. A relatively fresh impact crater near the center shows bright radial ejecta rays over darker regolith, surrounded by older, degraded craters and a scatter of boulders along a shallow rille.",
      facts: [
        { q: "how many large craters", a: "There are 3 large (>15% of frame) craters plus numerous smaller superposed craters.", keywords: ["how many", "craters", "crater", "count", "large"] },
        { q: "dominant surface material", a: "Fragmental regolith (impact-gardened dust and breccia) dominates the surface at ~82%.", keywords: ["surface", "material", "regolith", "dominant", "composition", "soil"] },
        { q: "ejecta rays fresh crater", a: "Yes — the central crater is the freshest, marked by high-albedo ejecta rays radiating outward.", keywords: ["ejecta", "rays", "fresh", "bright", "young"] },
        { q: "rille boulders", a: "A shallow sinuous rille crosses the lower frame with boulders scattered along its rim.", keywords: ["rille", "boulders", "rocks", "channel"] },
      ],
      objects: [
        { label: "Fresh rayed crater", count: 1, bbox: { x: 0.4, y: 0.34, w: 0.22, h: 0.28 }, note: "Bright ejecta rays" },
        { label: "Degraded crater", count: 2, bbox: { x: 0.08, y: 0.1, w: 0.24, h: 0.24 } },
        { label: "Sinuous rille", count: 1, bbox: { x: 0.1, y: 0.72, w: 0.7, h: 0.14 } },
      ],
      landCover: [
        { class: "Highland regolith", percent: 82, color: "#cbd5e1" },
        { class: "Fresh ejecta", percent: 11, color: "#f8fafc" },
        { class: "Crater shadow", percent: 7, color: "#475569" },
      ],
      regions: [
        { id: "crater", label: "Fresh rayed crater", synonyms: ["crater", "fresh", "rayed", "impact", "center"], bbox: { x: 0.4, y: 0.34, w: 0.22, h: 0.28 } },
        { id: "rille", label: "Sinuous rille", synonyms: ["rille", "channel", "valley", "groove"], bbox: { x: 0.1, y: 0.72, w: 0.7, h: 0.14 } },
        { id: "ejecta", label: "Ejecta ray field", synonyms: ["ejecta", "rays", "bright", "debris"], bbox: { x: 0.3, y: 0.24, w: 0.42, h: 0.48 } },
      ],
      baseConfidence: { caption: 0.88, vqa: 0.84, grounding: 0.8, change: 0.3, fusion: 0.3 },
    },
  },
  {
    id: "moon-southpole",
    body: "moon",
    title: "Lunar South Pole — Optical + SAR",
    subtitle: "Sensor pair · multimodal fusion (ice search)",
    mode: "pair",
    modality: "optical+sar",
    images: { optical: "/scenes/moon-sp-optical.png", sar: "/scenes/moon-sp-sar.png" },
    location: "Synthetic lunar south-pole crater (demo)",
    sensor: "Simulated optical + simulated dual-frequency SAR (DFSAR-style)",
    captured: "Coincident orbital pass",
    gsd: "~10 m/px (simulated)",
    provenance: {
      source: "Synthetic demonstration asset",
      license: "Demo use — generated imagery",
      synthetic: true,
      note: "Fusion task modeled on the Chandrayaan-2 DFSAR search for water ice in permanently shadowed south-pole craters. The SAR panel is a stylized backscatter / CPR rendering, not a calibrated radar product; no real mission data is used.",
    },
    suggestedQueries: [
      "Combine both sensors — is there evidence of water ice?",
      "What does SAR reveal inside the shadowed crater floor?",
      "Delineate the permanently shadowed region.",
      "Why can't optical see the crater interior?",
    ],
    availableIntents: ["fusion", "caption", "vqa", "grounding"],
    evidence: {
      caption:
        "A south-pole impact crater whose interior lies in permanent shadow. Optical resolves only the sunlit rim and terraced walls, leaving the floor near-black; SAR penetrates the shadow and returns bright, high-CPR patches on the floor consistent with candidate blocky water-ice deposits.",
      facts: [
        { q: "water ice evidence", a: "SAR shows several high-CPR (circular polarization ratio) bright patches on the shadowed floor — a signature consistent with, but not proof of, blocky water ice.", keywords: ["ice", "water", "cpr", "evidence", "frozen"] },
        { q: "sar reveal shadowed floor", a: "SAR is self-illuminating, so it images the permanently shadowed floor that optical cannot see, resolving rough ice-candidate and boulder returns.", keywords: ["sar", "reveal", "shadow", "floor", "radar", "backscatter"] },
        { q: "why optical cannot see interior", a: "The crater interior is permanently shadowed — no direct sunlight ever reaches it, so the passive optical sensor records near-zero signal.", keywords: ["optical", "cannot", "see", "shadow", "dark", "interior", "why"] },
      ],
      objects: [
        { label: "Ice-candidate patches (SAR-bright)", count: 1, bbox: { x: 0.38, y: 0.46, w: 0.28, h: 0.24 }, note: "High-CPR returns on shadowed floor" },
        { label: "Sunlit crater rim", count: 1, bbox: { x: 0.2, y: 0.16, w: 0.6, h: 0.16 } },
      ],
      landCover: [
        { class: "Permanently shadowed floor", percent: 41, color: "#334155" },
        { class: "Terraced crater walls", percent: 33, color: "#94a3b8" },
        { class: "Sunlit rim / highland", percent: 19, color: "#e2e8f0" },
        { class: "Ice-candidate (high-CPR)", percent: 7, color: "#67e8f9" },
      ],
      regions: [
        { id: "psr", label: "Permanently shadowed region", synonyms: ["shadow", "shadowed", "psr", "floor", "dark", "interior"], bbox: { x: 0.3, y: 0.4, w: 0.4, h: 0.4 } },
        { id: "rim", label: "Sunlit crater rim", synonyms: ["rim", "wall", "sunlit", "edge"], bbox: { x: 0.2, y: 0.16, w: 0.6, h: 0.16 } },
        { id: "ice", label: "Ice-candidate patches", synonyms: ["ice", "water", "cpr", "bright", "patch"], bbox: { x: 0.38, y: 0.46, w: 0.28, h: 0.24 } },
      ],
      fusionNotes: [
        "Optical constrains topography and sunlit albedo but is blind inside the permanently shadowed region.",
        "SAR is self-illuminating and penetrates shadow, so it is the only sensor here that images the crater floor.",
        "High circular-polarization-ratio (CPR) SAR patches are a water-ice indicator, but rough surfaces and boulders can mimic the signal — fusion lowers, but does not eliminate, the ambiguity.",
      ],
      baseConfidence: { caption: 0.82, vqa: 0.8, grounding: 0.76, change: 0.3, fusion: 0.85 },
    },
  },
]

export function getScene(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id)
}
