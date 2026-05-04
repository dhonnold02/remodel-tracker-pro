import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Task } from "@/hooks/useProjects";
import { toast } from "sonner";
import { showSuccess, showError } from "@/lib/toast";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  totalBudget: number;
  laborCosts: number;
  materialCosts: number;
  tasks: Omit<Task, "id">[];
  createdAt: string;
}

export function useTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = useCallback(async () => {
    if (!user) { setTemplates([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("project_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      showError("Failed to load templates — please refresh");
      setLoading(false);
      return;
    }

    setTemplates(
      (data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        totalBudget: Number(t.total_budget),
        laborCosts: Number(t.labor_costs),
        materialCosts: Number(t.material_costs),
        tasks: t.tasks || [],
        createdAt: t.created_at,
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const saveTemplate = useCallback(async (template: Omit<ProjectTemplate, "id" | "createdAt">) => {
    if (!user) return;
    await supabase.from("project_templates").insert({
      user_id: user.id,
      name: template.name,
      description: template.description,
      total_budget: template.totalBudget,
      labor_costs: template.laborCosts,
      material_costs: template.materialCosts,
      tasks: template.tasks as any,
    });
    await fetchTemplates();
  }, [user, fetchTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    await supabase.from("project_templates").delete().eq("id", id);
    await fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, saveTemplate, deleteTemplate };
}
