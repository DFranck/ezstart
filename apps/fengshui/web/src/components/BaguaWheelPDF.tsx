'use client'

import { Direction, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

type Props = {
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#fafafa',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  wheelContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  planImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#d1d5db',
  },
  orientationInfo: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sectorCard: {
    width: '31%',
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
  },
  sectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectorDirection: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  sectorTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  sectorElement: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  sectorKeywords: {
    fontSize: 8,
    color: '#4b5563',
    marginBottom: 4,
    lineHeight: 1.3,
  },
  sectorStar: {
    fontSize: 8,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 3,
    marginTop: 4,
  },
  footer: {
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    marginTop: 20,
  },
})

function getElementColor(element: string): string {
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
      return '#94a3b8'
  }
}

export default function BaguaWheelPDF({ config, planImage, bearingFromNorth }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏮 Analyse Feng Shui Bagua</Text>
          <Text style={styles.subtitle}>
            Vue d'ensemble de votre espace - Configuration {config.year || '2025'}
          </Text>
        </View>

        {/* Plan avec orientation */}
        {planImage && (
          <View style={styles.wheelContainer}>
            <View style={{ alignItems: 'center' }}>
              {/* Plan image avec bordure colorée */}
              <View style={{
                width: 200,
                height: 200,
                borderRadius: 100,
                overflow: 'hidden',
                borderWidth: 3,
                borderColor: '#3b82f6',
                marginBottom: 15
              }}>
                <Image src={planImage} style={{ width: 200, height: 200 }} />
              </View>

              <Text style={styles.orientationInfo}>
                Orientation du plan : {Math.round(bearingFromNorth)}° depuis le Nord
              </Text>

              {/* Indicateurs de direction simples */}
              <View style={{ flexDirection: 'row', marginTop: 10, gap: 20 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#ef4444', marginBottom: 4 }} />
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>N</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#22c55e', marginBottom: 4 }} />
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>E</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#f59e0b', marginBottom: 4 }} />
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>S</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#6366f1', marginBottom: 4 }} />
                  <Text style={{ fontSize: 9, fontWeight: 'bold' }}>O</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Grille des secteurs avec résumé */}
        <View style={styles.sectorsGrid}>
          {DIRECTIONS_WITH_CENTER.map((dir: Direction) => {
            const sector = (config as any).orientations[dir]
            if (!sector) return null
            const elementColor = getElementColor(sector.element)

            return (
              <View key={dir} style={[styles.sectorCard, { borderTopColor: elementColor, borderTopWidth: 3 }]}>
                {/* Header */}
                <View style={styles.sectorHeader}>
                  <View style={[styles.sectorDirection, { backgroundColor: elementColor }]}>
                    <Text>{dir}</Text>
                  </View>
                  <Text style={styles.sectorTitle}>{sector.title}</Text>
                </View>

                {/* Element */}
                <Text style={styles.sectorElement}>Élément : {sector.element}</Text>

                {/* Keywords (max 3) */}
                {sector.keywords && sector.keywords.length > 0 && (
                  <Text style={styles.sectorKeywords}>
                    {sector.keywords.slice(0, 3).join(' • ')}
                  </Text>
                )}

                {/* Star status */}
                {sector.star && (
                  <View style={[
                    styles.sectorStar,
                    {
                      backgroundColor: sector.star.status === 'bonne' ? '#dcfce7' : '#fef2f2',
                      color: sector.star.status === 'bonne' ? '#16a34a' : '#dc2626',
                    }
                  ]}>
                    <Text>Étoile 2025 : {sector.star.status}</Text>
                  </View>
                )}
              </View>
            )
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Rapport généré le {new Date().toLocaleDateString('fr-FR')} • Feng Shui Bagua Analysis
          </Text>
          <Text style={{ marginTop: 4 }}>
            Pour une analyse détaillée, consultez le rapport complet
          </Text>
        </View>
      </Page>
    </Document>
  )
}