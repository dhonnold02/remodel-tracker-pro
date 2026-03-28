import { useState } from "react";
import { Task } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import ProgressBar from "./ProgressBar";
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskListProps {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
}

interface SortableTaskProps {
  task: Task;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  onRemove: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateNotes: (notes: string) => void;
}

const SortableTask = ({
  task,
  isExpanded,
  onToggleExpand,
  onToggleComplete,
  onRemove,
  onUpdateTitle,
  onUpdateNotes,
}: SortableTaskProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-background p-3 space-y-2"
    >
      <div className="flex items-center gap-2">
        <button
          className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <Checkbox
          checked={task.completed}
          onCheckedChange={onToggleComplete}
        />
        <input
          value={task.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          className={`flex-1 bg-transparent text-sm outline-none font-body min-w-0 ${
            task.completed ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        />
        <button
          onClick={onToggleExpand}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {isExpanded && (
        <textarea
          placeholder="Add notes…"
          value={task.notes}
          onChange={(e) => onUpdateNotes(e.target.value)}
          className="w-full text-sm bg-secondary rounded-md p-2 outline-none resize-none text-foreground placeholder:text-muted-foreground min-h-[60px]"
        />
      )}
    </div>
  );
};

const TaskList = ({ tasks, onChange }: TaskListProps) => {
  const [newTask, setNewTask] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const completedCount = tasks.filter((t) => t.completed).length;
  const completionPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const addTask = () => {
    if (!newTask.trim()) return;
    onChange([
      ...tasks,
      { id: crypto.randomUUID(), title: newTask.trim(), notes: "", completed: false },
    ]);
    setNewTask("");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      onChange(arrayMove(tasks, oldIndex, newIndex));
    }
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks yet. Add one above.
              </p>
            )}
            {tasks.map((task) => (
              <SortableTask
                key={task.id}
                task={task}
                isExpanded={expandedId === task.id}
                onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                onToggleComplete={() =>
                  onChange(tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)))
                }
                onRemove={() => onChange(tasks.filter((t) => t.id !== task.id))}
                onUpdateTitle={(title) =>
                  onChange(tasks.map((t) => (t.id === task.id ? { ...t, title } : t)))
                }
                onUpdateNotes={(notes) =>
                  onChange(tasks.map((t) => (t.id === task.id ? { ...t, notes } : t)))
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default TaskList;
