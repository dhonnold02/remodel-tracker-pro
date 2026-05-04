import { useState } from "react";
import { useTemplates, ProjectTemplate } from "@/hooks/useTemplates";
import { ProjectData, Task } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookTemplate, Trash2, FileDown, FileUp } from "lucide-react";
import { toast } from "sonner";
import { showSuccess, showError } from "@/lib/toast";

interface Props {
  onCreateFromTemplate: (template: ProjectTemplate) => void;
  currentProject?: ProjectData;
}

const ProjectTemplates = ({ onCreateFromTemplate, currentProject }: Props) => {
  const { templates, loading, saveTemplate, deleteTemplate } = useTemplates();
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDesc, setTemplateDesc] = useState("");

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim() || !currentProject) return;
    await saveTemplate({
      name: templateName.trim(),
      description: templateDesc.trim(),
      totalBudget: currentProject.totalBudget,
      laborCosts: currentProject.laborCosts,
      materialCosts: currentProject.materialCosts,
      tasks: currentProject.tasks.map(({ id, ...rest }) => rest),
    });
    setTemplateName("");
    setTemplateDesc("");
    setSaveOpen(false);
    showSuccess("Template saved!");
  };

  // Hide entirely when there are no templates and no current project to save from
  if (!loading && templates.length === 0 && !currentProject) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookTemplate className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Templates</h2>
        </div>
        {currentProject && (
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 text-xs rounded-xl">
                <FileDown className="h-3.5 w-3.5 mr-1" />
                Save as Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save Project as Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <Input
                  placeholder="Template name…"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()}
                  className="rounded-xl"
                />
                <Input
                  placeholder="Description (optional)…"
                  value={templateDesc}
                  onChange={(e) => setTemplateDesc(e.target.value)}
                  className="rounded-xl"
                />
                <Button onClick={handleSaveAsTemplate} className="w-full rounded-xl" disabled={!templateName.trim()}>
                  Save Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No templates yet. Save a project as a template to reuse it.</p>
      ) : (
        <div className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border bg-background p-4 hover:shadow-sm transition-shadow duration-150">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.tasks.length} tasks · ${t.totalBudget.toLocaleString()} budget
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-9 text-xs rounded-xl" onClick={() => onCreateFromTemplate(t)}>
                  <FileUp className="h-3.5 w-3.5 mr-1" /> Use
                </Button>
                <button onClick={() => deleteTemplate(t.id)} aria-label="Delete template" className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectTemplates;
