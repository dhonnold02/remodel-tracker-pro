export interface Task {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
}

export interface FileAttachment {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
}

export interface ChangeOrder {
  id: string;
  text: string;
  createdAt: string;
}

export interface ProjectData {
  id: string;
  name: string;
  parentId?: string; // if set, this is a sub-project
  totalBudget: number;
  laborCosts: number;
  materialCosts: number;
  startDate: string;
  endDate: string;
  tasks: Task[];
  photos: FileAttachment[];
  blueprints: FileAttachment[];
  changeOrders: ChangeOrder[];
  createdAt: string;
}

export const createProject = (name = "", parentId?: string): ProjectData => ({
  id: crypto.randomUUID(),
  name,
  ...(parentId ? { parentId } : {}),
  totalBudget: 0,
  laborCosts: 0,
  materialCosts: 0,
  startDate: "",
  endDate: "",
  tasks: [],
  photos: [],
  blueprints: [],
  changeOrders: [],
  createdAt: new Date().toISOString(),
});

export const getProjectStats = (p: ProjectData) => {
  const totalSpent = p.laborCosts + p.materialCosts;
  const remaining = p.totalBudget - totalSpent;
  const budgetPercent = p.totalBudget > 0 ? (totalSpent / p.totalBudget) * 100 : 0;
  const completedTasks = p.tasks.filter((t) => t.completed).length;
  const taskPercent = p.tasks.length > 0 ? (completedTasks / p.tasks.length) * 100 : 0;
  return { totalSpent, remaining, budgetPercent, completedTasks, taskPercent };
};

/** Aggregate stats across a parent project and its sub-projects */
export const getAggregatedStats = (parent: ProjectData, subProjects: ProjectData[]) => {
  const all = [parent, ...subProjects];
  const totalBudget = all.reduce((s, p) => s + p.totalBudget, 0);
  const totalSpent = all.reduce((s, p) => s + p.laborCosts + p.materialCosts, 0);
  const remaining = totalBudget - totalSpent;
  const budgetPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const totalTasks = all.reduce((s, p) => s + p.tasks.length, 0);
  const completedTasks = all.reduce((s, p) => s + p.tasks.filter((t) => t.completed).length, 0);
  const taskPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  return { totalBudget, totalSpent, remaining, budgetPercent, completedTasks, totalTasks, taskPercent };
};
