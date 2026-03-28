export interface Task {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
}

export interface ProjectData {
  name: string;
  totalBudget: number;
  laborCosts: number;
  materialCosts: number;
  startDate: string;
  endDate: string;
  tasks: Task[];
}

export const defaultProject: ProjectData = {
  name: "",
  totalBudget: 0,
  laborCosts: 0,
  materialCosts: 0,
  startDate: "",
  endDate: "",
  tasks: [],
};
