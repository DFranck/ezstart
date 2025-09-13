'use client'

import { Direction, DIRECTIONS } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

type Props = {
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    textAlign: 'center',
    marginBottom: 30,
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  orientationSection: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  orientationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  orientationText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 5,
  },
  sectionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sectionCard: {
    width: '45%',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionDirection: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  sectionElement: {
    fontSize: 12,
    color: '#ffffff',
    backgroundColor: '#6b7280',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionKeywords: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 1.4,
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    textAlign: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#9ca3af',
  },
})

function getElementColor(element: string): string {
  switch (element) {
    case 'Eau':
      return '#0ea5e9'
    case 'Bois':
      return '#22c55e'
    case 'Feu':
      return '#ef4444'
    case 'Terre':
      return '#a16207'
    case 'Métal':
      return '#64748b'
    default:
      return '#6b7280'
  }
}

export default function BaguaWheelPDF({ config, planImage, bearingFromNorth }: Props) {
  if (!config) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text>Erreur : Configuration Bagua manquante</Text>
        </Page>
      </Document>
    )
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏮 Analyse Feng Shui Bagua</Text>
          <Text style={styles.subtitle}>Configuration {config.year || '2025'}</Text>
        </View>

        {/* Orientation Info */}
        <View style={styles.orientationSection}>
          <Text style={styles.orientationTitle}>Orientation de votre plan</Text>
          <Text style={styles.orientationText}>
            Rotation : {Math.round(bearingFromNorth)}° depuis le Nord
          </Text>
          <Text style={styles.orientationText}>
            Votre plan a été analysé selon les 8 directions du Bagua
          </Text>
        </View>

        {/* Sections Bagua */}
        <View style={styles.sectionsGrid}>
          {DIRECTIONS.map((dir: Direction) => {
            const sector = (config as any)?.orientations?.[dir]
            if (!sector) return null

            return (
              <View key={dir} style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionDirection}>{dir}</Text>
                  <Text
                    style={[
                      styles.sectionElement,
                      { backgroundColor: getElementColor(sector.element) },
                    ]}
                  >
                    {sector.element}
                  </Text>
                </View>
                <Text style={styles.sectionTitle}>{sector.title}</Text>
                {sector.summary && <Text style={styles.sectionKeywords}>{sector.summary}</Text>}
                {sector.keywords && sector.keywords.length > 0 && (
                  <Text style={styles.sectionKeywords}>
                    Mots-clés : {sector.keywords.slice(0, 3).join(', ')}
                  </Text>
                )}
              </View>
            )
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Rapport généré le {new Date().toLocaleDateString('fr-FR')} • Feng Shui Bagua Analysis
          </Text>
        </View>
      </Page>
    </Document>
  )
}
