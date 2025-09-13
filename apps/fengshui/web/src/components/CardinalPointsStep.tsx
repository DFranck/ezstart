/* path: /components/BaguaPdfPreview.tsx */
'use client'

import type { Direction } from '@/types/directions'
import { DIRECTIONS } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import {
  Circle,
  ClipPath,
  Defs,
  Document,
  G,
  Image,
  PDFViewer,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  pdf,
} from '@react-pdf/renderer'
import { useMemo, useState } from 'react'

/* ---------------- utils ---------------- */

const degToRad = (d: number) => (d * Math.PI) / 180

function getElementColor(element?: string) {
  switch (element) {
    case 'Eau':
      return '#0D47A1'
    case 'Bois':
      return '#2E7D32'
    case 'Feu':
      return '#D32F2F'
    case 'Terre':
      return '#8B7355'
    case 'Métal':
      return '#757575'
    default:
      return '#111827'
  }
}

/** ligne centre -> bord à un cap depuis le Nord (sens horaire) */
function rayPath(cx: number, cy: number, r: number, degFromNorth: number) {
  const a = 90 - degFromNorth
  const x = cx + r * Math.cos(degToRad(a))
  const y = cy - r * Math.sin(degToRad(a))
  return `M ${cx} ${cy} L ${x} ${y}`
}

/** polygone \"étoile\" style web: R1 (pics) et R2 (creux) */
function starPolygonPoints(
  cx: number,
  cy: number,
  R1: number, // rayon des pics (extérieur)
  R2: number // rayon des creux (entre pics)
): string {
  const pts: string[] = []
  for (let i = 0; i < 8; i++) {
    const aPic = 90 - i * 45 // pic pile sur la direction
    const x1 = cx + R1 * Math.cos(degToRad(aPic))
    const y1 = cy - R1 * Math.sin(degToRad(aPic))
    pts.push(`${x1} ${y1}`)
    // creux au milieu du secteur
    const aCreux = 90 - (i * 45 + 22.5)
    const x2 = cx + R2 * Math.cos(degToRad(aCreux))
    const y2 = cy - R2 * Math.sin(degToRad(aCreux))
    pts.push(`${x2} ${y2}`)
  }
  return pts.join(' ')
}

/* ---------------- styles ---------------- */

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#f5f7fb',
  },
  header: {
    textAlign: 'center',
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  orientationInfo: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 14,
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    marginTop: 12,
  },
})

/* ---------------- PDF Doc ---------------- */

export type BaguaPdfProps = {
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
}

export function BaguaDocument({ config, planImage, bearingFromNorth }: BaguaPdfProps) {
  // géométrie inspirée de ta roue web
  const cx = 50
  const cy = 50
  const r = 34 // rayon du cercle image
  const starR1 = r + 16 // pics extérieurs (étoile)
  const starR2 = r + 6 // creux inter-pics
  const labelR = r + 18 // rayon des labels (NO, N, NE, ...)

  const rot = (((bearingFromNorth % 360) + 360) % 360) + (config?.rotationOffsetDeg ?? 0)

  const clipId = `bagua-clip-${Math.round(Math.random() * 1e9)}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>🏮 Analyse Feng Shui Bagua</Text>
          <Text style={styles.subtitle}>
            Configuration {config.year || '2025'} — Orientation {Math.round(bearingFromNorth)}°
          </Text>
        </View>

        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 420,
              height: 420,
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 18,
            }}
          >
            <Svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
              <Defs>
                <ClipPath id={clipId}>
                  <Circle cx={cx} cy={cy} r={r} />
                </ClipPath>
              </Defs>

              {/* étoile pointillée (comme sur le web) */}
              <G transform={`rotate(${rot}, ${cx}, ${cy})`}>
                <Path
                  d={`M ${starPolygonPoints(cx, cy, starR1, starR2)} Z`}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth={1.2}
                  strokeDasharray="4 5"
                />

                {/* rayons internes pointillés */}
                {Array.from({ length: 8 }).map((_, i) => (
                  <Path
                    key={`ray-${i}`}
                    d={rayPath(cx, cy, r + 0.001, i * 45 + 22.5)} // rayon au milieu de chaque secteur
                    stroke="rgba(0,0,0,0.20)"
                    strokeWidth={0.8}
                    strokeDasharray="2 3"
                    fill="none"
                  />
                ))}
              </G>

              {/* image centrée et clippée au cercle */}
              {planImage && (
                <image
                  href={planImage}
                  x={cx - r}
                  y={cy - r}
                  width={r * 2}
                  height={r * 2}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${clipId})`}
                />
              )}

              {/* cercle fin au bord de l'image */}
              <Circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={0.8} />

              {/* labels (couleur par élément) */}
              <G transform={`rotate(${rot}, ${cx}, ${cy})`}>
                {DIRECTIONS.map((dir, i) => {
                  const a = i * 45
                  const svgA = 90 - a
                  const tx = cx + labelR * Math.cos(degToRad(svgA))
                  const ty = cy - labelR * Math.sin(degToRad(svgA))
                  const sector = config.orientations?.[dir as Direction]
                  const color = getElementColor(sector?.element)
                  return (
                    <text
                      key={`lbl-${dir}`}
                      x={tx}
                      y={ty + 1.2} // petit offset vertical; dominantBaseline pas fiable en PDF
                      fontSize={4.4}
                      fontWeight="bold"
                      textAnchor="middle"
                      fill={color}
                    >
                      {dir}
                    </text>
                  )
                })}
              </G>
            </Svg>

            <Text style={styles.orientationInfo}>
              Orientation :{' '}
              <Text style={{ color: '#111827' }}>{Math.round(bearingFromNorth)}°</Text> depuis le
              Nord.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Rapport généré le {new Date().toLocaleDateString('fr-FR')} • Feng Shui Bagua</Text>
        </View>
      </Page>
    </Document>
  )
}

/* --------------- wrapper web (preview + download) --------------- */

export type BaguaPdfPreviewProps = {
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
  height?: number
}

export default function BaguaPdfPreview({
  config,
  planImage,
  bearingFromNorth,
  height = 560,
}: BaguaPdfPreviewProps) {
  const [downloading, setDownloading] = useState(false)
  const doc = useMemo(
    () => (
      <BaguaDocument config={config} planImage={planImage} bearingFromNorth={bearingFromNorth} />
    ),
    [config, planImage, bearingFromNorth]
  )

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await pdf(doc).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bagua-${config.year || '2025'}-${Math.round(bearingFromNorth)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 gap-2">
        <h3 className="text-sm font-semibold">Aperçu de votre rapport PDF</h3>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm shadow-sm hover:bg-gray-50 disabled:opacity-60"
        >
          <span>📥</span>
          {downloading ? 'Génération…' : 'Télécharger PDF'}
        </button>
      </div>
      <div className="rounded-xl overflow-hidden border">
        <PDFViewer style={{ width: '100%', height }} showToolbar>
          {doc}
        </PDFViewer>
      </div>
    </div>
  )
}
