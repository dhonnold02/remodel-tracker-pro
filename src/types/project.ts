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

export const createProject = (name = ""): ProjectData => ({
  id: crypto.randomUUID(),
  name,
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
