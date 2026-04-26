import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { PunchListItem, PunchStatus } from "@/components/PunchList";

export interface PunchOutPdfProps {
  companyName: string;
  logoUrl?: string;
  projectName: string;
  projectAddress: string;
  signedBy: string;
  signedDate: string;
  generatedDate: string;
  total: number;
  passed: number;
  failed: number;
  items: PunchListItem[];
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#0f1117",
    position: "relative",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: "#1d4ed8",
  },
  body: {
    marginLeft: 30,
  },
  header: {
    paddingTop: 28,
    paddingRight: 40,
    paddingBottom: 20,
    borderBottom: "1pt solid #e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eyebrow: {
    fontSize: 7,
    color: "#1d4ed8",
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  projectName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f1117",
  },
  projectAddress: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 3,
  },
  logo: {
    width: 70,
    height: 40,
    objectFit: "contain",
  },
  companyTextRight: {
    textAlign: "right",
  },
  companyName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#0f1117",
  },
  companySub: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 2,
  },
  banner: {
    margin: 16,
    padding: 14,
    backgroundColor: "#f0fdf4",
    border: "1pt solid #bbf7d0",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  bannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16a34a",
    marginRight: 10,
  },
  bannerTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#15803d",
  },
  bannerSub: {
    fontSize: 9,
    color: "#16a34a",
    marginTop: 2,
  },
  bannerRight: {
    textAlign: "right",
  },
  bannerLabel: {
    fontSize: 8,
    color: "#6b7280",
  },
  bannerSigner: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#0f1117",
    marginTop: 1,
  },
  bannerDate: {
    fontSize: 8,
    color: "#6b7280",
    marginTop: 1,
  },
  statsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    border: "1pt solid #e5e7eb",
    borderRadius: 6,
  },
  statCol: {
    flex: 1,
    padding: 12,
  },
  statColDivider: {
    borderRight: "1pt solid #e5e7eb",
  },
  statLabel: {
    fontSize: 8,
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 4,
  },
  itemsSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  itemsHeading: {
    fontSize: 8,
    color: "#9ca3af",
    letterSpacing: 1.5,
    marginBottom: 8,
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  tableHeader: {
    backgroundColor: "#f9fafb",
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottom: "1pt solid #e5e7eb",
  },
  th: {
    fontSize: 8,
    color: "#6b7280",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottom: "1pt solid #f3f4f6",
    alignItems: "center",
  },
  rowAlt: {
    backgroundColor: "#f9fafb",
  },
  cellItem: { flex: 3, fontSize: 9, color: "#111827" },
  cellStatusWrap: { flex: 1, flexDirection: "row" },
  cellAssignee: { flex: 2, fontSize: 9, color: "#374151" },
  pill: {
    fontSize: 8,
    fontWeight: "bold",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  pillPass: { backgroundColor: "#f0fdf4", color: "#15803d" },
  pillFail: { backgroundColor: "#fef2f2", color: "#dc2626" },
  pillPending: { backgroundColor: "#f3f4f6", color: "#6b7280" },
  emptyRow: {
    paddingVertical: 18,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 9,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "1pt solid #e5e7eb",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#9ca3af",
  },
});

const StatusPill = ({ status }: { status: PunchStatus }) => {
  if (status === "pass") {
    return <Text style={[styles.pill, styles.pillPass]}>PASS</Text>;
  }
  if (status === "fail") {
    return <Text style={[styles.pill, styles.pillFail]}>FAIL</Text>;
  }
  return <Text style={[styles.pill, styles.pillPending]}>PENDING</Text>;
};

export const PunchOutPdfDocument = ({
  companyName,
  logoUrl,
  projectName,
  projectAddress,
  signedBy,
  signedDate,
  generatedDate,
  total,
  passed,
  failed,
  items,
}: PunchOutPdfProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} fixed />

        <View style={styles.body}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>PUNCH OUT REPORT</Text>
              <Text style={styles.projectName}>{projectName}</Text>
              <Text style={styles.projectAddress}>{projectAddress || "—"}</Text>
            </View>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <View style={styles.companyTextRight}>
                <Text style={styles.companyName}>{companyName}</Text>
                <Text style={styles.companySub}>Licensed Contractor</Text>
              </View>
            )}
          </View>

          {/* Completion banner */}
          <View style={styles.banner}>
            <View style={styles.bannerLeft}>
              <View style={styles.bannerDot} />
              <View>
                <Text style={styles.bannerTitle}>
                  All punch out items complete
                </Text>
                <Text style={styles.bannerSub}>
                  This project has been inspected and signed off
                </Text>
              </View>
            </View>
            <View style={styles.bannerRight}>
              <Text style={styles.bannerLabel}>Signed off by</Text>
              <Text style={styles.bannerSigner}>{signedBy}</Text>
              <Text style={styles.bannerDate}>{signedDate}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={[styles.statCol, styles.statColDivider]}>
              <Text style={styles.statLabel}>Total Items</Text>
              <Text style={[styles.statNumber, { color: "#0f1117" }]}>
                {total}
              </Text>
            </View>
            <View style={[styles.statCol, styles.statColDivider]}>
              <Text style={styles.statLabel}>Passed</Text>
              <Text style={[styles.statNumber, { color: "#16a34a" }]}>
                {passed}
              </Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Failed</Text>
              <Text style={[styles.statNumber, { color: "#dc2626" }]}>
                {failed}
              </Text>
            </View>
          </View>

          {/* Items section */}
          <View style={styles.itemsSection}>
            <Text style={styles.itemsHeading}>Punch Out Items</Text>

            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 3 }]}>Item</Text>
              <Text style={[styles.th, { flex: 1 }]}>Status</Text>
              <Text style={[styles.th, { flex: 2 }]}>Assignee</Text>
            </View>

            {items.length === 0 ? (
              <Text style={styles.emptyRow}>No items</Text>
            ) : (
              items.map((it, idx) => (
                <View
                  key={it.id}
                  style={[styles.row, idx % 2 === 1 ? styles.rowAlt : {}]}
                  wrap={false}
                >
                  <Text style={styles.cellItem}>{it.title}</Text>
                  <View style={styles.cellStatusWrap}>
                    <StatusPill status={it.status} />
                  </View>
                  <Text style={styles.cellAssignee}>{it.assignee || "—"}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {companyName} · Generated by Sightline · {generatedDate}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};
