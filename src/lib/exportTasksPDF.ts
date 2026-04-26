import { Task } from "@/hooks/useProjects";

interface ExportTasksPDFArgs {
  projectName: string;
  projectAddress?: string;
  tasks: Task[];
  brandLogoUrl?: string | null;
  brandName?: string | null;
}

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function exportTasksPDF({
  projectName,
  projectAddress,
  tasks,
  brandLogoUrl,
  brandName,
}: ExportTasksPDFArgs) {
  // Group: parents (top-level) + their subtasks
  const parents = tasks.filter((t) => !t.parentTaskId);
  const subsByParent: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (t.parentTaskId) {
      (subsByParent[t.parentTaskId] = subsByParent[t.parentTaskId] || []).push(t);
    }
  }

  // Group parents by phase to keep printout organised
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

  const checkbox = (done: boolean) =>
    done
      ? `<span style="display:inline-block; width:11px; height:11px; border:1.5px solid #16a34a; border-radius:2px; margin-right:8px; vertical-align:middle; background:#16a34a; flex-shrink:0;"></span>`
      : `<span style="display:inline-block; width:11px; height:11px; border:1.5px solid #9ca3af; border-radius:2px; margin-right:8px; vertical-align:middle; flex-shrink:0;"></span>`;

  const renderTaskItem = (t: Task) => {
    const subs = subsByParent[t.id] || [];
    const subsHtml = subs.length
      ? `<ul class="subs">${subs
          .map(
            (s) =>
              `<li class="${s.completed ? "done" : ""}">${checkbox(s.completed)}<span class="title">${esc(s.title || "(untitled)")}</span></li>`,
          )
          .join("")}</ul>`
      : "";
    return `<li class="${t.completed ? "done" : ""}">${checkbox(t.completed)}<span class="title">${esc(t.title || "(untitled)")}</span>${subsHtml}</li>`;
  };

  const phasesHtml = phaseOrder
    .map(
      (ph) => `
      <section class="phase">
        <h2>${esc(ph)}</h2>
        <ul class="tasks">${byPhase[ph].map(renderTaskItem).join("")}</ul>
      </section>`,
    )
    .join("");

  const logoHtml = brandLogoUrl
    ? `<img src="${esc(brandLogoUrl)}" alt="${esc(brandName || "Logo")}" class="logo" />`
    : "";

  const brandBlock = `
    <div class="brand">
      ${logoHtml}
      ${brandName ? `<div class="brand-name">${esc(brandName)}</div>` : ""}
    </div>
  `;

  const safeName = (projectName || "project")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const filename = `${safeName}-task-list.pdf`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(projectName)} — Task List</title>
<style>
  * { box-sizing: border-box; }
  html, body { background: #ffffff; color: #1f2937; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    max-width: 760px;
    margin: 0 auto;
    padding: 48px 56px;
    font-size: 13px;
    line-height: 1.55;
  }
  header.doc {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 20px;
    margin-bottom: 32px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo { max-height: 56px; max-width: 120px; object-fit: contain; }
  .brand-name { font-weight: 700; font-size: 16px; color: #374151; }
  .project { text-align: right; }
  .project h1 {
    margin: 0 0 4px 0;
    font-size: 22px;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.01em;
  }
  .project .addr { color: #6b7280; font-size: 12px; }
  .meta { color: #9ca3af; font-size: 11px; margin-top: 6px; }

  .phase {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e5e7eb;
    page-break-inside: avoid;
  }
  .phase:last-of-type { border-bottom: none; }
  .phase h2 {
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #374151;
    margin: 0 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #f3f4f6;
  }
  ul.tasks {
    list-style: none;
    padding-left: 0;
    margin: 0;
  }
  ul.tasks > li { margin: 6px 0; color: #1f2937; }
  ul.tasks > li .title { font-weight: 500; }
  ul.subs {
    list-style: none;
    padding-left: 24px;
    margin: 4px 0 8px 0;
  }
  ul.subs > li { color: #4b5563; margin: 3px 0; font-weight: 400; }
  .cb {
    display: inline-block;
    width: 16px;
    margin-right: 6px;
    color: #6b7280;
    font-size: 14px;
    line-height: 1;
  }
  li.done { color: #9ca3af; }
  li.done > .title { color: #9ca3af; }
  li.done > .cb { color: #9ca3af; }

  .empty {
    color: #9ca3af;
    font-style: italic;
    padding: 24px 0;
    text-align: center;
  }

  @page { margin: 0.6in; }
  @media print {
    body { padding: 0; }
    header.doc { margin-bottom: 24px; }
  }
</style>
</head>
<body>
  <header class="doc">
    ${brandBlock}
    <div class="project">
      <h1>${esc(projectName)}</h1>
      ${projectAddress ? `<div class="addr">${esc(projectAddress)}</div>` : ""}
      <div class="meta">Task list · ${new Date().toLocaleDateString()}</div>
    </div>
  </header>
  ${phasesHtml || `<div class="empty">No tasks yet.</div>`}
  <script>
    document.title = ${JSON.stringify(filename.replace(/\.pdf$/, ""))};
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 300);
    });
  </script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
