import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { Task, TaskPriority } from "@/hooks/useProjects";

export interface TasksPdfProps {
  companyName: string;
  logoUrl?: string;
  projectName: string;
  projectAddress: string;
  generatedDate: string;
  tasks: Task[];
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    paddingTop: 0,
    paddingBottom: 50,
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
  header: {
    marginLeft: 30,
    paddingTop: 24,
    paddingRight: 40,
    paddingBottom: 16,
    borderBottom: "1pt solid #e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 7,
    color: "#1d4ed8",
    fontWeight: "bold",
    letterSpacing: 1.5,
    marginBottom: 4,
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
  statsStrip: {
    marginLeft: 30,
    marginRight: 40,
    marginTop: 14,
    flexDirection: "row",
    gap: 24,
  },
  statText: {
    fontSize: 8,
    color: "#6b7280",
  },
  statCompleted: {
    fontSize: 8,
    color: "#16a34a",
  },
  statRemaining: {
    fontSize: 8,
    color: "#dc2626",
  },
  divider: {
    marginLeft: 30,
    marginRight: 40,
    marginTop: 10,
    borderBottom: "1pt solid #e5e7eb",
  },
  phaseSection: {
    marginLeft: 30,
    marginRight: 40,
    marginTop: 16,
  },
  phaseHeader: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#1d4ed8",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1pt solid #e5e7eb",
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    borderBottom: "1pt solid #f3f4f6",
  },
  checkbox: {
    width: 10,
    height: 10,
    border: "1pt solid #d1d5db",
    borderRadius: 2,
    marginRight: 10,
  },
  checkboxDone: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  taskTitle: {
    flex: 1,
    fontSize: 9,
    color: "#111827",
  },
  taskTitleDone: {
    color: "#9ca3af",
    textDecoration: "line-through",
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dueDate: {
    fontSize: 8,
    color: "#6b7280",
  },
  priorityPill: {
    fontSize: 7,
    fontWeight: "bold",
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 3,
    textTransform: "uppercase",
  },
  priorityHigh: { backgroundColor: "#fef2f2", color: "#dc2626" },
  priorityMed: { backgroundColor: "#fffbeb", color: "#d97706" },
  priorityLow: { backgroundColor: "#f0fdf4", color: "#16a34a" },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    paddingLeft: 22,
    borderBottom: "1pt solid #f3f4f6",
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 8.5,
    color: "#4b5563",
  },
  emptyText: {
    marginLeft: 30,
    marginRight: 40,
    marginTop: 30,
    fontSize: 10,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
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

const PriorityBadge = ({ priority }: { priority: TaskPriority }) => {
  if (priority === "high") {
    return <Text style={[styles.priorityPill, styles.priorityHigh]}>High</Text>;
  }
  if (priority === "medium") {
    return <Text style={[styles.priorityPill, styles.priorityMed]}>Med</Text>;
  }
  return <Text style={[styles.priorityPill, styles.priorityLow]}>Low</Text>;
};

const TaskRow = ({ task, isSubtask }: { task: Task; isSubtask?: boolean }) => (
  <View style={isSubtask ? styles.subtaskRow : styles.taskRow} wrap={false}>
    <View
      style={[styles.checkbox, task.completed ? styles.checkboxDone : {}]}
    />
    <Text
      style={[
        isSubtask ? styles.subtaskTitle : styles.taskTitle,
        task.completed ? styles.taskTitleDone : {},
      ]}
    >
      {task.title || "(untitled)"}
    </Text>
    <View style={styles.taskMeta}>
      {task.dueDate ? (
        <Text style={styles.dueDate}>{task.dueDate}</Text>
      ) : null}
      <PriorityBadge priority={task.priority} />
    </View>
  </View>
);

export const TasksPdfDocument = ({
  companyName,
  logoUrl,
  projectName,
  projectAddress,
  generatedDate,
  tasks,
}: TasksPdfProps) => {
  // Group parents by phase, attach subtasks
  const parents = tasks.filter((t) => !t.parentTaskId);
  const subsByParent: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (t.parentTaskId) {
      (subsByParent[t.parentTaskId] = subsByParent[t.parentTaskId] || []).push(
        t,
      );
    }
  }

  const phaseOrder: string[] = [];
  const byPhase: Record<string, Task[]> = {};
  for (const p of parents) {
    const ph = p.phase || "General";
    if (!byPhase[ph]) {
      byPhase[ph] = [];
      phaseOrder.push(ph);
    }
    byPhase[ph].push(p);
  }

  const leafTasks = tasks.filter(
    (t) => !tasks.some((c) => c.parentTaskId === t.id),
  );
  const total = tasks.length;
  const completed = leafTasks.filter((t) => t.completed).length;
  const remaining = leafTasks.length - completed;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} fixed />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>TASK LIST</Text>
            <Text style={styles.projectName}>{projectName}</Text>
            {projectAddress ? (
              <Text style={styles.projectAddress}>{projectAddress}</Text>
            ) : null}
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

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <Text style={styles.statText}>Generated: {generatedDate}</Text>
          <Text style={styles.statText}>Total Tasks: {total}</Text>
          <Text style={styles.statCompleted}>Completed: {completed}</Text>
          <Text style={styles.statRemaining}>Remaining: {remaining}</Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Phases */}
        {phaseOrder.length === 0 ? (
          <Text style={styles.emptyText}>No tasks yet.</Text>
        ) : (
          phaseOrder.map((ph) => (
            <View key={ph} style={styles.phaseSection}>
              <Text style={styles.phaseHeader}>{ph}</Text>
              {byPhase[ph].map((parent) => (
                <View key={parent.id}>
                  <TaskRow task={parent} />
                  {(subsByParent[parent.id] || []).map((sub) => (
                    <TaskRow key={sub.id} task={sub} isSubtask />
                  ))}
                </View>
              ))}
            </View>
          ))
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {companyName} · Remodel Tracker Pro · {generatedDate}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber }) => `Page ${pageNumber}`}
          />
        </View>
      </Page>
    </Document>
  );
};
