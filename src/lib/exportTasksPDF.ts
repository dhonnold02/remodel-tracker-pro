import { pdf } from "@react-pdf/renderer";
import { createElement } from "react";
import { Task } from "@/hooks/useProjects";
import { TasksPdfDocument } from "./TasksPdfDocument";

interface ExportTasksPDFArgs {
  projectName: string;
  projectAddress?: string;
  tasks: Task[];
  brandLogoUrl?: string | null;
  brandName?: string | null;
}

export async function exportTasksPDF({
  projectName,
  projectAddress,
  tasks,
  brandLogoUrl,
  brandName,
}: ExportTasksPDFArgs) {
  const generatedDate = new Date().toLocaleDateString();
  const companyName = brandName || "Remodel Tracker Pro";

  const blob = await pdf(
    createElement(TasksPdfDocument, {
      companyName,
      logoUrl: brandLogoUrl || undefined,
      projectName: projectName || "Project",
      projectAddress: projectAddress || "",
      generatedDate,
      tasks,
    }),
  ).toBlob();

  const safeName = (projectName || "project")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  const dateSlug = new Date().toISOString().slice(0, 10);
  const filename = `${safeName}-Tasks-${dateSlug}.pdf`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
