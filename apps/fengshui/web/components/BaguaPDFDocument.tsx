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
    marginBottom: 25,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 5,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  planSection: {
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  planImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  orientation: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: 'semibold',
  },
  sectorsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectorCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1px solid #f3f4f6',
  },
  sectorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 10,
  },
  sectorElement: {
    fontSize: 9,
    color: '#ffffff',
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
    fontWeight: 'bold',
  },
  sectorDirection: {
    fontSize: 9,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'semibold',
  },
  sectorSummary: {
    fontSize: 10,
    color: '#4b5563',
    marginBottom: 12,
    fontStyle: 'italic',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 10,
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  keywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  keyword: {
    fontSize: 8,
    color: '#475569',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    fontWeight: 'medium',
  },
  listItem: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 3,
    paddingLeft: 10,
    lineHeight: 1.4,
  },
  notes: {
    fontSize: 9,
    color: '#4b5563',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    backgroundColor: '#fafafa',
  },
  // Bagua Base Section (permanent)
  baguaBaseSection: {
    backgroundColor: '#f0f9ff',
    borderWidth: 2,
    borderColor: '#0369a1',
    borderRadius: 10,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#0369a1',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  baguaBaseSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: '#e0f2fe',
    padding: 6,
    borderRadius: 6,
  },
  baseSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#bae6fd',
  },
  baseListItem: {
    fontSize: 9,
    color: '#0369a1',
    marginBottom: 3,
    paddingLeft: 10,
    lineHeight: 1.3,
  },
  cyclesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  cycleItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#0369a1',
    borderRadius: 6,
    padding: 8,
    textAlign: 'center',
  },
  cycleTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 3,
  },
  cycleText: {
    fontSize: 8,
    color: '#0369a1',
    fontWeight: 'medium',
  },
  // Stars Section (temporary)
  starsSection: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  starsSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  starTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 3,
  },
  starElement: {
    fontSize: 9,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  starSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  starListItem: {
    fontSize: 9,
    color: '#4b5563',
    marginBottom: 3,
    paddingLeft: 10,
    lineHeight: 1.3,
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
      return '#BCA16A'
    case 'Métal':
      return '#B0BEC5'
    default:
      return '#94a3b8'
  }
}

export default function BaguaPDFDocument({ config, planImage, bearingFromNorth }: Props) {
  // Grouper les secteurs par pages (2 secteurs par page pour éviter les coupures)
  const sectorsPerPage = 2
  const pages: Direction[][] = []

  for (let i = 0; i < DIRECTIONS_WITH_CENTER.length; i += sectorsPerPage) {
    pages.push(DIRECTIONS_WITH_CENTER.slice(i, i + sectorsPerPage))
  }

  return (
    <Document>
      {/* Page de couverture */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analyse Feng Shui Bagua</Text>
          <Text style={styles.subtitle}>
            Rapport détaillé de votre espace selon les principes du Feng Shui
          </Text>
        </View>

        {/* Plan image */}
        {planImage && (
          <View style={styles.planSection}>
            <Image src={planImage} style={styles.planImage} />
            <Text style={styles.orientation}>
              Orientation : {Math.round(bearingFromNorth)} degres depuis le Nord
            </Text>
          </View>
        )}

        {/* Sommaire */}
        <View
          style={{
            marginTop: 25,
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: 20,
            borderWidth: 1,
            borderColor: '#e5e7eb',
          }}
        >
          <Text style={styles.sectorsTitle}>Sommaire des orientations</Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {DIRECTIONS_WITH_CENTER.map((dir: Direction) => {
              const sector = config.orientations[dir]
              if (!sector) return null

              const elementColor = getElementColor(sector.element)

              return (
                <View
                  key={dir}
                  style={{
                    flex: '1 1 45%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 10,
                    padding: 8,
                    backgroundColor: '#f8fafc',
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      backgroundColor: elementColor,
                      marginRight: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 8, color: '#ffffff', fontWeight: 'bold' }}>{dir}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        color: '#1f2937',
                        fontWeight: 'bold',
                        marginBottom: 1,
                      }}
                    >
                      {sector.title}
                    </Text>
                    <Text style={{ fontSize: 8, color: '#6b7280' }}>{sector.element}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        </View>

        {/* Footer première page */}
        <View style={styles.footer}>
          <Text>
            Rapport genere le {new Date().toLocaleDateString('fr-FR')} - Feng Shui Bagua Analysis -
            Configuration {config.year || '2025'}
          </Text>
        </View>
      </Page>

      {/* Pages des secteurs (2 par page) */}
      {pages.map((pageDirections, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <Text style={[styles.sectorsTitle, { marginBottom: 20 }]}>
            Orientations Bagua - Page {pageIndex + 2}
          </Text>

          {pageDirections.map((dir: Direction) => {
            const sector = config.orientations[dir]
            if (!sector) return null

            const elementColor = getElementColor(sector.element)

            return (
              <View
                key={dir}
                style={[styles.sectorCard, { borderTopColor: elementColor, marginBottom: 25 }]}
                break={false} // Empêche la coupure du secteur
              >
                {/* Header du secteur */}
                <View style={styles.sectorHeader}>
                  <Text style={styles.sectorTitle}>{sector.title}</Text>
                  <Text style={styles.sectorElement}>{sector.element}</Text>
                  <Text style={styles.sectorDirection}>{dir}</Text>
                </View>

                {sector.summary && <Text style={styles.sectorSummary}>{sector.summary}</Text>}

                {/* Mots-clés */}
                {sector.keywords && sector.keywords.length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle}>Mots-clés</Text>
                    <View style={styles.keywords}>
                      {sector.keywords.map((keyword: string) => (
                        <Text key={keyword} style={styles.keyword}>
                          {keyword}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {/* BAGUA DE BASE - Section permanente */}
                <View style={styles.baguaBaseSection}>
                  <Text style={styles.baguaBaseSectionTitle}>Bagua de Base (permanent)</Text>

                  {/* Activateurs de base */}
                  {sector.enhancers && sector.enhancers.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.baseSectionTitle}>Activateurs naturels</Text>
                      {sector.enhancers.map((enhancer: string, index: number) => (
                        <Text key={index} style={styles.baseListItem}>
                          • {enhancer}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Matières favorables */}
                  {sector.matiere && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={styles.baseSectionTitle}>Matieres favorables</Text>
                      <Text style={styles.baseListItem}>{sector.matiere}</Text>
                    </View>
                  )}

                  {/* Cycles des éléments */}
                  <View style={{ marginBottom: 8 }}>
                    <Text style={styles.baseSectionTitle}>Cycles des 5 elements</Text>
                    <View style={styles.cyclesContainer}>
                      <View style={styles.cycleItem}>
                        <Text style={styles.cycleTitle}>Nourri par</Text>
                        <Text style={styles.cycleText}>{sector.nourisher}</Text>
                      </View>
                      <View style={styles.cycleItem}>
                        <Text style={styles.cycleTitle}>Controle par</Text>
                        <Text style={styles.cycleText}>{sector.controller}</Text>
                      </View>
                      <View style={styles.cycleItem}>
                        <Text style={styles.cycleTitle}>Affaibli par</Text>
                        <Text style={styles.cycleText}>{sector.weakenedBy}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* ÉTOILES VOLANTES - Section temporaire */}
                {sector.star && (
                  <View
                    style={[
                      styles.starsSection,
                      {
                        backgroundColor: sector.star.status === 'bonne' ? '#dcfce7' : '#fef2f2',
                        borderColor: sector.star.status === 'bonne' ? '#16a34a' : '#dc2626',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.starsSectionTitle,
                        { color: sector.star.status === 'bonne' ? '#16a34a' : '#dc2626' },
                      ]}
                    >
                      Etoile Volante 2025 ({sector.star.status})
                    </Text>

                    <View style={{ marginBottom: 8 }}>
                      <Text style={styles.starTitle}>{sector.star.star}</Text>
                      {sector.star.element && (
                        <Text style={styles.starElement}>Element : {sector.star.element}</Text>
                      )}
                    </View>

                    {sector.star.remedies.length > 0 && (
                      <View>
                        <Text style={styles.starSectionTitle}>Remedes specifiques 2025</Text>
                        {sector.star.remedies.map((remedy: string, index: number) => (
                          <Text key={index} style={styles.starListItem}>
                            • {remedy}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Autres sections (si nécessaires) */}
                {sector.tips && sector.tips.length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle}>Conseils</Text>
                    {sector.tips.map((tip: string, index: number) => (
                      <Text key={index} style={styles.listItem}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}

                {sector.avoid && sector.avoid.length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle}>A eviter</Text>
                    {sector.avoid.map((item: string, index: number) => (
                      <Text key={index} style={styles.listItem}>
                        • {item}
                      </Text>
                    ))}
                  </View>
                )}

                {sector.symbols && sector.symbols.length > 0 && (
                  <View>
                    <Text style={styles.sectionTitle}>Symboles</Text>
                    <Text style={styles.listItem}>{sector.symbols.join(', ')}</Text>
                  </View>
                )}

                {sector.notes && (
                  <View style={styles.notes}>
                    <Text>{sector.notes}</Text>
                  </View>
                )}
              </View>
            )
          })}

          {/* Footer pages secteurs */}
          <View style={styles.footer}>
            <Text>
              Page {pageIndex + 2} / {pages.length + 1} - Feng Shui Bagua Analysis
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
