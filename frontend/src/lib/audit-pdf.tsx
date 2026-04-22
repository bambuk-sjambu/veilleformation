import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  // Cover page styles
  coverPage: {
    padding: 60,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  coverLogo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 20,
  },
  coverTitle: {
    fontSize: 24,
    color: "#1e3a8a",
    marginBottom: 10,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 40,
    textAlign: "center",
  },
  coverInfo: {
    backgroundColor: "#f3f4f6",
    padding: 20,
    borderRadius: 8,
    width: "80%",
    marginBottom: 40,
  },
  coverInfoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  coverInfoLabel: {
    width: "40%",
    fontSize: 10,
    color: "#6b7280",
  },
  coverInfoValue: {
    width: "60%",
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  coverFooter: {
    position: "absolute",
    bottom: 60,
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "center",
  },
  // Header styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    borderBottom: "2px solid #1e40af",
    paddingBottom: 10,
  },
  headerLeft: {
    width: "55%",
  },
  headerRight: {
    width: "40%",
    textAlign: "right",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 3,
  },
  companyInfo: {
    fontSize: 8,
    color: "#4b5563",
    lineHeight: 1.3,
  },
  reportTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e40af",
  },
  reportDate: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 3,
  },
  // Summary box
  summaryBox: {
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 5,
    marginBottom: 15,
    borderLeft: "4px solid #1e40af",
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1e40af",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryItem: {
    width: "20%",
    marginBottom: 5,
    paddingRight: 10,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e40af",
  },
  summaryLabel: {
    fontSize: 7,
    color: "#6b7280",
  },
  // Impact chart (text-based)
  impactBox: {
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  impactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  impactLabel: {
    width: "15%",
    fontSize: 8,
    color: "#374151",
  },
  impactBar: {
    width: "60%",
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    overflow: "hidden",
  },
  impactBarFill: {
    height: "100%",
  },
  impactBarFort: {
    backgroundColor: "#dc2626",
  },
  impactBarMoyen: {
    backgroundColor: "#f59e0b",
  },
  impactBarFaible: {
    backgroundColor: "#10b981",
  },
  impactCount: {
    width: "25%",
    fontSize: 8,
    color: "#6b7280",
    textAlign: "right",
  },
  // Section styles
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 8,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 4,
  },
  // Indicator section
  indicatorSection: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#fafafa",
    borderRadius: 4,
    borderLeft: "3px solid #1e40af",
  },
  indicatorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  indicatorTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  indicatorBadge: {
    fontSize: 8,
    color: "#1e40af",
    backgroundColor: "#dbeafe",
    padding: "2px 6px",
    borderRadius: 3,
  },
  // Article
  article: {
    marginBottom: 6,
    paddingLeft: 8,
    borderLeft: "2px solid #d1d5db",
  },
  articleTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 1,
  },
  articleMeta: {
    fontSize: 7,
    color: "#9ca3af",
    marginBottom: 1,
  },
  articleSummary: {
    fontSize: 8,
    color: "#4b5563",
    lineHeight: 1.3,
  },
  // Action
  actionSection: {
    marginBottom: 10,
  },
  actionGroupTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 5,
  },
  action: {
    marginBottom: 5,
    paddingLeft: 8,
    borderLeft: "2px solid #10b981",
    backgroundColor: "#f0fdf4",
    padding: 4,
    borderRadius: 2,
  },
  actionTodo: {
    borderLeftColor: "#6b7280",
    backgroundColor: "#f9fafb",
  },
  actionInProgress: {
    borderLeftColor: "#f59e0b",
    backgroundColor: "#fffbeb",
  },
  actionDescription: {
    fontSize: 9,
    color: "#374151",
  },
  actionMeta: {
    fontSize: 7,
    color: "#9ca3af",
    marginTop: 2,
  },
  // Sources table
  sourcesTable: {
    marginTop: 5,
  },
  sourceRow: {
    flexDirection: "row",
    borderBottom: "1px solid #e5e7eb",
    paddingVertical: 4,
  },
  sourceName: {
    width: "40%",
    fontSize: 8,
    color: "#374151",
  },
  sourceCount: {
    width: "20%",
    fontSize: 8,
    color: "#6b7280",
    textAlign: "center",
  },
  // Signature
  signatureSection: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: "1px solid #e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "45%",
    textAlign: "center",
  },
  signatureLine: {
    borderBottom: "1px solid #374151",
    marginBottom: 8,
    marginTop: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#9ca3af",
  },
});

interface Article {
  id: number;
  title: string;
  source: string;
  category: string | null;
  published_date: string | null;
  summary: string | null;
  impact_level: string | null;
  qualiopi_indicators: string | null;
  collected_at: string;
}

interface Action {
  id: number;
  article_id: number;
  action_description: string;
  responsible: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
}

interface Profile {
  company_name: string;
  siret: string | null;
  nde: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  responsible_name: string | null;
  responsible_function: string | null;
  methodology_notes: string | null;
}

interface AuditPDFProps {
  profile: Profile | null;
  articles: Article[];
  actions: Action[];
  dateStart: string;
  dateEnd: string;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("fr-FR");
};

const getSourceLabel = (source: string) => {
  const labels: Record<string, string> = {
    boamp: "BOAMP",
    legifrance: "Legifrance",
    opco_atlas: "OPCO Atlas",
    opco_akto: "OPCO Akto",
    opco_ep: "OPCO EP",
    opco_mobilites: "OPCO Mobilites",
    constructys: "Constructys",
    opcommerce: "OP Commerce",
    ocaopiat: "Ocapiat",
    france_travail: "France Travail",
    region: "Region",
  };
  return labels[source] || source;
};

export function AuditPDF({ profile, articles, actions, dateStart, dateEnd }: AuditPDFProps) {
  // Group articles by indicator
  const articlesByIndicator: Record<string, Article[]> = { "23": [], "24": [], "25": [], "26": [] };
  articles.forEach((article) => {
    if (article.qualiopi_indicators) {
      let indicators: string[] = [];
      try {
        // Try JSON parse first (format: "[23, 24]")
        indicators = JSON.parse(article.qualiopi_indicators).map((i: number) => String(i));
      } catch {
        // Fallback to comma split (format: "23, 24")
        indicators = article.qualiopi_indicators.split(",").map((i) => i.trim());
      }
      indicators.forEach((ind) => {
        if (articlesByIndicator[ind]) articlesByIndicator[ind].push(article);
      });
    } else {
      articlesByIndicator["23"].push(article);
    }
  });

  // Group actions by status
  const actionsDone = actions.filter((a) => a.status === "fait");
  const actionsInProgress = actions.filter((a) => a.status === "en_cours");
  const actionsTodo = actions.filter((a) => a.status === "a_faire");

  // Count by impact
  const impactCounts = { fort: 0, moyen: 0, faible: 0 };
  articles.forEach((a) => {
    if (a.impact_level && impactCounts[a.impact_level as keyof typeof impactCounts] !== undefined) {
      impactCounts[a.impact_level as keyof typeof impactCounts]++;
    }
  });

  // Count by source
  const sourceCounts: Record<string, number> = {};
  articles.forEach((a) => {
    sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
  });

  // Count by category
  const categoryCounts: Record<string, number> = { reglementaire: 0, ao: 0, metier: 0, handicap: 0 };
  articles.forEach((a) => {
    if (a.category && categoryCounts[a.category] !== undefined) {
      categoryCounts[a.category]++;
    }
  });

  const indicatorLabels: Record<string, string> = {
    "23": "Indicateur 23 - Veille legale et reglementaire",
    "24": "Indicateur 24 - Metiers, competences et emplois",
    "25": "Indicateur 25 - Innovations pedagogiques et technologiques",
    "26": "Indicateur 26 - Handicap et compensations",
  };

  const totalArticles = articles.length;
  const maxImpact = Math.max(impactCounts.fort, impactCounts.moyen, impactCounts.faible, 1);

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverLogo}>VeilleFormation.fr</Text>
        <Text style={styles.coverTitle}>Rapport de Veille Reglementaire</Text>
        <Text style={styles.coverSubtitle}>Preuve de conformite Qualiopi - Indicateurs 23 a 26</Text>

        <View style={styles.coverInfo}>
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverInfoLabel}>Organisme :</Text>
            <Text style={styles.coverInfoValue}>{profile?.company_name || "Non renseigne"}</Text>
          </View>
          {profile?.siret && (
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>SIRET :</Text>
              <Text style={styles.coverInfoValue}>{profile.siret}</Text>
            </View>
          )}
          {profile?.nde && (
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>NDE :</Text>
              <Text style={styles.coverInfoValue}>{profile.nde}</Text>
            </View>
          )}
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverInfoLabel}>Periode couverte :</Text>
            <Text style={styles.coverInfoValue}>{formatDate(dateStart)} - {formatDate(dateEnd)}</Text>
          </View>
          <View style={styles.coverInfoRow}>
            <Text style={styles.coverInfoLabel}>Date du rapport :</Text>
            <Text style={styles.coverInfoValue}>{formatDate(new Date().toISOString())}</Text>
          </View>
          {profile?.responsible_name && (
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>Responsable veille :</Text>
              <Text style={styles.coverInfoValue}>{profile.responsible_name}{profile.responsible_function ? ` (${profile.responsible_function})` : ""}</Text>
            </View>
          )}
        </View>

        <Text style={styles.coverFooter}>Document genere automatiquement par VeilleFormation.fr</Text>
      </Page>

      {/* Content Page */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{profile?.company_name || "Organisme de Formation"}</Text>
            {profile?.address && <Text style={styles.companyInfo}>{profile.address}</Text>}
            {profile?.city && <Text style={styles.companyInfo}>{profile.city}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>Rapport de Veille Qualiopi</Text>
            <Text style={styles.reportDate}>Periode: {formatDate(dateStart)} - {formatDate(dateEnd)}</Text>
            <Text style={styles.reportDate}>Genere le: {formatDate(new Date().toISOString())}</Text>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Resume Executif</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{totalArticles}</Text>
              <Text style={styles.summaryLabel}>Articles surveilles</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{actionsDone.length}</Text>
              <Text style={styles.summaryLabel}>Actions completees</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{actionsInProgress.length}</Text>
              <Text style={styles.summaryLabel}>En cours</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{actionsTodo.length}</Text>
              <Text style={styles.summaryLabel}>A faire</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{articlesByIndicator["23"].length}</Text>
              <Text style={styles.summaryLabel}>Ind. 23</Text>
            </View>
          </View>
        </View>

        {/* Impact Distribution */}
        <View style={styles.impactBox}>
          <Text style={{ fontSize: 10, fontWeight: "bold", color: "#374151", marginBottom: 8 }}>Repartition par niveau d'impact</Text>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Fort</Text>
            <View style={styles.impactBar}>
              <View style={[styles.impactBarFill, styles.impactBarFort, { width: `${(impactCounts.fort / maxImpact) * 100}%` }]} />
            </View>
            <Text style={styles.impactCount}>{impactCounts.fort} articles</Text>
          </View>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Moyen</Text>
            <View style={styles.impactBar}>
              <View style={[styles.impactBarFill, styles.impactBarMoyen, { width: `${(impactCounts.moyen / maxImpact) * 100}%` }]} />
            </View>
            <Text style={styles.impactCount}>{impactCounts.moyen} articles</Text>
          </View>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Faible</Text>
            <View style={styles.impactBar}>
              <View style={[styles.impactBarFill, styles.impactBarFaible, { width: `${(impactCounts.faible / maxImpact) * 100}%` }]} />
            </View>
            <Text style={styles.impactCount}>{impactCounts.faible} articles</Text>
          </View>
        </View>

        {/* Sources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sources de Veille</Text>
          <View style={styles.sourcesTable}>
            <View style={[styles.sourceRow, { backgroundColor: "#f3f4f6" }]}>
              <Text style={[styles.sourceName, { fontWeight: "bold" }]}>Source</Text>
              <Text style={[styles.sourceCount, { fontWeight: "bold" }]}>Articles</Text>
            </View>
            {Object.entries(sourceCounts).slice(0, 6).map(([source, count]) => (
              <View key={source} style={styles.sourceRow}>
                <Text style={styles.sourceName}>{getSourceLabel(source)}</Text>
                <Text style={styles.sourceCount}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Methodology */}
        {profile?.methodology_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Methodologie de Veille</Text>
            <Text style={{ fontSize: 9, color: "#4b5563", lineHeight: 1.4 }}>{profile.methodology_notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Rapport genere par VeilleFormation.fr - Certification Qualiopi</Text>
          <Text>Page 2</Text>
        </View>
      </Page>

      {/* Actions Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{profile?.company_name || "Organisme de Formation"}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>Actions Menees</Text>
          </View>
        </View>

        <View style={styles.section}>
          {actionsDone.length > 0 && (
            <View style={styles.actionSection}>
              <Text style={[styles.actionGroupTitle, { color: "#059669" }]}>Actions completees ({actionsDone.length})</Text>
              {actionsDone.slice(0, 8).map((action) => (
                <View key={action.id} style={styles.action}>
                  <Text style={styles.actionDescription}>{action.action_description}</Text>
                  <Text style={styles.actionMeta}>
                    Responsable: {action.responsible || "Non defini"} | Complete le: {formatDate(action.completed_at)}
                  </Text>
                </View>
              ))}
              {actionsDone.length > 8 && (
                <Text style={{ fontSize: 8, color: "#9ca3af", marginTop: 5 }}>... et {actionsDone.length - 8} autres actions</Text>
              )}
            </View>
          )}

          {actionsInProgress.length > 0 && (
            <View style={styles.actionSection}>
              <Text style={[styles.actionGroupTitle, { color: "#d97706" }]}>Actions en cours ({actionsInProgress.length})</Text>
              {actionsInProgress.slice(0, 5).map((action) => (
                <View key={action.id} style={[styles.action, styles.actionInProgress]}>
                  <Text style={styles.actionDescription}>{action.action_description}</Text>
                  <Text style={styles.actionMeta}>
                    Responsable: {action.responsible || "Non defini"} | Echeance: {formatDate(action.due_date)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {actionsTodo.length > 0 && (
            <View style={styles.actionSection}>
              <Text style={[styles.actionGroupTitle, { color: "#6b7280" }]}>Actions planifiees ({actionsTodo.length})</Text>
              {actionsTodo.slice(0, 5).map((action) => (
                <View key={action.id} style={[styles.action, styles.actionTodo]}>
                  <Text style={styles.actionDescription}>{action.action_description}</Text>
                  <Text style={styles.actionMeta}>
                    Responsable: {action.responsible || "Non defini"} | Echeance: {formatDate(action.due_date)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Signature */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Le responsable veille</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{profile?.responsible_name || "Nom et signature"}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Le directeur</Text>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Nom et signature</Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Rapport genere par VeilleFormation.fr</Text>
          <Text>Page 3</Text>
        </View>
      </Page>

      {/* Detail by Indicator Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{profile?.company_name || "Organisme de Formation"}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportTitle}>Detail par Indicateur</Text>
          </View>
        </View>

        {Object.entries(articlesByIndicator).map(([indicator, indicatorArticles]) => (
          <View key={indicator} style={styles.indicatorSection}>
            <View style={styles.indicatorHeader}>
              <Text style={styles.indicatorTitle}>{indicatorLabels[indicator]}</Text>
              <Text style={styles.indicatorBadge}>{indicatorArticles.length} articles</Text>
            </View>
            {indicatorArticles.slice(0, 3).map((article) => (
              <View key={article.id} style={styles.article}>
                <Text style={styles.articleTitle}>{article.title.substring(0, 80)}{article.title.length > 80 ? "..." : ""}</Text>
                <Text style={styles.articleMeta}>
                  {getSourceLabel(article.source)} | {formatDate(article.published_date)} | Impact: {article.impact_level || "Non evalue"}
                </Text>
                {article.summary && (
                  <Text style={styles.articleSummary}>{article.summary.substring(0, 120)}...</Text>
                )}
              </View>
            ))}
            {indicatorArticles.length > 3 && (
              <Text style={{ fontSize: 7, color: "#9ca3af", marginTop: 3 }}>... et {indicatorArticles.length - 3} autres articles</Text>
            )}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>Rapport genere par VeilleFormation.fr</Text>
          <Text>Page 4</Text>
        </View>
      </Page>
    </Document>
  );
}
