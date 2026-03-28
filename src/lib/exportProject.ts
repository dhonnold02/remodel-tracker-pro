import { ProjectData, Task } from "@/hooks/useProjects";

/* ─── CSV Export ─── */
export function exportProjectCSV(project: ProjectData, subProjects: ProjectData[]) {
  const lines: string[] = [];

  // Project summary
  lines.push("Section,Field,Value");
  lines.push(`Project,Name,"${esc(project.name)}"`);
  lines.push(`Project,Total Budget,"${project.totalBudget}"`);
  lines.push(`Project,Labor Costs,"${project.laborCosts}"`);
  lines.push(`Project,Material Costs,"${project.materialCosts}"`);
  lines.push(`Project,Total Spent,"${project.laborCosts + project.materialCosts}"`);
  lines.push(`Project,Remaining,"${project.totalBudget - project.laborCosts - project.materialCosts}"`);
  lines.push(`Project,Start Date,"${project.startDate}"`);
  lines.push(`Project,End Date,"${project.endDate}"`);
  lines.push("");

  // Tasks
  lines.push("Task ID,Title,Status,Priority,Due Date,Parent Task,Tags,Notes");
  for (const t of project.tasks) {
    lines.push(`"${t.id}","${esc(t.title)}","${t.completed ? "Completed" : "Pending"}","${t.priority}","${t.dueDate || ""}","${t.parentTaskId || ""}","${t.tags.join("; ")}","${esc(t.notes)}"`);
  }
  lines.push("");

  // Change orders
  if (project.changeOrders.length > 0) {
    lines.push("Change Order ID,Text,Created At");
    for (const o of project.changeOrders) {
      lines.push(`"${o.id}","${esc(o.text)}","${o.createdAt}"`);
    }
    lines.push("");
  }

  // Sub-projects summary
  if (subProjects.length > 0) {
    lines.push("Sub-Project,Budget,Spent,Tasks Total,Tasks Completed");
    for (const s of subProjects) {
      const spent = s.laborCosts + s.materialCosts;
      const done = s.tasks.filter(t => t.completed).length;
      lines.push(`"${esc(s.name)}","${s.totalBudget}","${spent}","${s.tasks.length}","${done}"`);
    }
  }

  downloadFile(`${project.name || "project"}-export.csv`, lines.join("\n"), "text/csv");
}

/* ─── PDF-style HTML report (opens print dialog) ─── */
export function exportProjectPDF(project: ProjectData, subProjects: ProjectData[]) {
  const totalSpent = project.laborCosts + project.materialCosts;
  const remaining = project.totalBudget - totalSpent;
  const completedTasks = project.tasks.filter(t => t.completed).length;
  const pendingTasks = project.tasks.length - completedTasks;

  const highPriority = project.tasks.filter(t => t.priority === "high" && !t.completed).length;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(project.name)} Report</title>
<style>
body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;color:#1a1a1a;font-size:13px}
h1{font-size:22px;margin-bottom:4px}
h2{font-size:16px;margin-top:28px;border-bottom:1px solid #e5e5e5;padding-bottom:6px}
.meta{color:#666;font-size:12px;margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:12px 0}
.card{background:#f9fafb;border:1px solid #e5e5e5;border-radius:8px;padding:12px}
.card .label{font-size:10px;text-transform:uppercase;color:#888;letter-spacing:0.5px}
.card .value{font-size:18px;font-weight:700;margin-top:2px}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px}
th{text-align:left;border-bottom:2px solid #e5e5e5;padding:6px 8px;font-size:11px;text-transform:uppercase;color:#888}
td{border-bottom:1px solid #f0f0f0;padding:6px 8px}
.badge{display:inline-block;padding:1px 6px;border-radius:10px;font-size:10px;font-weight:600}
.high{background:#fef2f2;color:#dc2626}.medium{background:#fffbeb;color:#d97706}.low{background:#eff6ff;color:#3b82f6}
.done{color:#16a34a}.pending{color:#d97706}
@media print{body{padding:20px}}
</style></head><body>
<h1>${esc(project.name)}</h1>
<div class="meta">Generated ${new Date().toLocaleDateString()} · ${project.startDate ? `${project.startDate} – ${project.endDate}` : "No dates set"}</div>

<h2>Budget Overview</h2>
<div class="grid">
<div class="card"><div class="label">Total Budget</div><div class="value">$${project.totalBudget.toLocaleString()}</div></div>
<div class="card"><div class="label">Total Spent</div><div class="value">$${totalSpent.toLocaleString()}</div></div>
<div class="card"><div class="label">Remaining</div><div class="value" style="color:${remaining < 0 ? '#dc2626' : '#1a1a1a'}">$${remaining.toLocaleString()}</div></div>
</div>

<h2>Task Summary</h2>
<div class="grid">
<div class="card"><div class="label">Completed</div><div class="value done">${completedTasks}</div></div>
<div class="card"><div class="label">Pending</div><div class="value pending">${pendingTasks}</div></div>
<div class="card"><div class="label">High Priority</div><div class="value" style="color:#dc2626">${highPriority}</div></div>
</div>

<h2>All Tasks</h2>
<table>
<thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Due Date</th><th>Tags</th></tr></thead>
<tbody>
${project.tasks.map(t => `<tr>
<td>${t.parentTaskId ? "↳ " : ""}${esc(t.title)}</td>
<td><span class="${t.completed ? "done" : "pending"}">${t.completed ? "✓ Done" : "Pending"}</span></td>
<td><span class="badge ${t.priority}">${t.priority}</span></td>
<td>${t.dueDate || "—"}</td>
<td>${t.tags.join(", ") || "—"}</td>
</tr>`).join("")}
</tbody></table>

${project.changeOrders.length > 0 ? `
<h2>Change Orders</h2>
<table><thead><tr><th>Description</th><th>Date</th></tr></thead><tbody>
${project.changeOrders.map(o => `<tr><td>${esc(o.text)}</td><td>${new Date(o.createdAt).toLocaleDateString()}</td></tr>`).join("")}
</tbody></table>` : ""}

${subProjects.length > 0 ? `
<h2>Sub-Projects</h2>
<table><thead><tr><th>Name</th><th>Budget</th><th>Spent</th><th>Tasks</th></tr></thead><tbody>
${subProjects.map(s => {
  const sp = s.laborCosts + s.materialCosts;
  const d = s.tasks.filter(t => t.completed).length;
  return `<tr><td>${esc(s.name)}</td><td>$${s.totalBudget.toLocaleString()}</td><td>$${sp.toLocaleString()}</td><td>${d}/${s.tasks.length}</td></tr>`;
}).join("")}
</tbody></table>` : ""}

</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}

function esc(s: string) {
  return s.replace(/"/g, '""').replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
