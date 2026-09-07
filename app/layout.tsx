import type { Metadata, Viewport } from "next"
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google"
import { AmbientBackdrop } from "@/components/ambient-backdrop"
import "./globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "SatQuery AI — Ask satellite imagery anything, on Earth and the Moon",
  description:
    "An agentic remote-sensing intelligence console spanning Earth and the Moon. Ask questions of optical, SAR and before/after satellite imagery and get grounded, evidence-backed answers with a transparent reasoning trace.",
  keywords: [
    "remote sensing",
    "satellite imagery",
    "vision language model",
    "SAR",
    "change detection",
    "geospatial AI",
    "agentic AI",
  ],
  authors: [{ name: "SatQuery AI" }],
  openGraph: {
    title: "SatQuery AI — Ask satellite imagery anything, on Earth and the Moon",
    description:
      "Grounded, evidence-backed answers over optical, SAR and bitemporal satellite imagery — from Earth scenes to lunar craters — with a transparent agentic reasoning trace.",
    type: "website",
  },
}

export const viewport: Viewport = {
  themeColor: "#05050f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} bg-background`}
    >
      <body className="min-h-dvh text-foreground antialiased">
        <AmbientBackdrop />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  )
}
