import { useState } from "react";
import { Task } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import ProgressBar from "./ProgressBar";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
}

const TaskList = ({ tasks, onChange }: TaskListProps) => {
  const [newTask, setNewTask] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.completed).length;
  const completionPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const addTask = () => {
    if (!newTask.trim()) return;
    onChange([
      ...tasks,
      { id: crypto.randomUUID(), title: newTask.trim(), notes: "", completed: false },
    ]);
    setNewTask("");
  };

  const toggleTask = (id: string) => {
    onChange(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const removeTask = (id: string) => {
    onChange(tasks.filter((t) => t.id !== id));
  };

  const updateNotes = (id: string, notes: string) => {
    onChange(tasks.map((t) => (t.id === id ? { ...t, notes } : t)));
  };

  const updateTitle = (id: string, title: string) => {
    onChange(tasks.map((t) => (t.id === id ? { ...t, title } : t)));
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Tasks</h2>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{tasks.length}
        </span>
      </div>

      <ProgressBar label="Completion" value={completionPercent} variant="completion" />

      {/* Add task */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a task…"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          className="flex-1"
        />
        <Button size="icon" onClick={addTask} className="shrink-0">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Task items */}
      <div className="space-y-2">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks yet. Add one above.
          </p>
        )}
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-lg border bg-background p-3 space-y-2"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={task.completed}
                onCheckedChange={() => toggleTask(task.id)}
              />
              <input
                value={task.title}
                onChange={(e) => updateTitle(task.id, e.target.value)}
                className={`flex-1 bg-transparent text-sm outline-none font-body ${
                  task.completed ? "line-through text-muted-foreground" : "text-foreground"
                }`}
              />
              <button
                onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                {expandedId === task.id ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => removeTask(task.id)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {expandedId === task.id && (
              <textarea
                placeholder="Add notes…"
                value={task.notes}
                onChange={(e) => updateNotes(task.id, e.target.value)}
                className="w-full text-sm bg-secondary rounded-md p-2 outline-none resize-none text-foreground placeholder:text-muted-foreground min-h-[60px]"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskList;
