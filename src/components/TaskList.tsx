import { useState } from "react";
import { Task } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProgressBar from "./ProgressBar";
import { format, isPast, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, ChevronDown, ChevronUp, ChevronRight,
  GripVertical, ListTree, CalendarIcon, AlertTriangle,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskListProps {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
}

/* ─── Due date helpers ─── */
const getDueDateStatus = (dueDate?: string | null, completed?: boolean) => {
  if (!dueDate || completed) return null;
  try {
    const date = parseISO(dueDate);
    if (isPast(date) && !isToday(date)) return "overdue";
    if (isToday(date)) return "today";
    return null;
  } catch {
    return null;
  }
};

/* ─── Due date picker inline ─── */
const DueDatePicker = ({
  dueDate,
  completed,
  onChange,
}: {
  dueDate?: string | null;
  completed: boolean;
  onChange: (date: string | null) => void;
}) => {
  const status = getDueDateStatus(dueDate, completed);
  const parsed = dueDate ? parseISO(dueDate) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md transition-colors shrink-0",
            status === "overdue"
              ? "text-destructive bg-destructive/10 font-medium"
              : status === "today"
              ? "text-amber-600 bg-amber-500/10 font-medium"
              : dueDate
              ? "text-muted-foreground hover:text-foreground"
              : "text-muted-foreground/50 hover:text-muted-foreground"
          )}
        >
          {status === "overdue" && <AlertTriangle className="h-3 w-3" />}
          <CalendarIcon className="h-3 w-3" />
          {dueDate ? format(parsed!, "MMM d") : "Due"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)}
          className={cn("p-3 pointer-events-auto")}
        />
        {dueDate && (
          <div className="px-3 pb-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7 text-muted-foreground"
              onClick={() => onChange(null)}
            >
              Clear due date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

/* ─── Sortable single task row ─── */
interface SortableTaskProps {
  task: Task;
  isExpanded: boolean;
  indent?: boolean;
  hasSubtasks: boolean;
  subtasksOpen: boolean;
  onToggleSubtasks: () => void;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  onRemove: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateNotes: (notes: string) => void;
  onUpdateDueDate: (date: string | null) => void;
  onAddSubtask: () => void;
}

const SortableTask = ({
  task, isExpanded, indent, hasSubtasks, subtasksOpen,
  onToggleSubtasks, onToggleExpand, onToggleComplete,
  onRemove, onUpdateTitle, onUpdateNotes, onUpdateDueDate, onAddSubtask,
}: SortableTaskProps) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const status = getDueDateStatus(task.dueDate, task.completed);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-background p-3 space-y-2",
        indent && "ml-6 border-l-2 border-l-primary/20",
        status === "overdue" && "border-destructive/40",
      )}
    >
      <div className="flex items-center gap-2">
        <button
          className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {!indent && hasSubtasks && (
          <button
            onClick={onToggleSubtasks}
            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0"
          >
            {subtasksOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}

        <Checkbox checked={task.completed} onCheckedChange={onToggleComplete} />
        <input
          value={task.title}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder={indent ? "Subtask title…" : "Task title…"}
          className={cn(
            "flex-1 bg-transparent text-sm outline-none font-body min-w-0",
            task.completed ? "line-through text-muted-foreground" : "text-foreground",
          )}
        />

        <DueDatePicker
          dueDate={task.dueDate}
          completed={task.completed}
          onChange={onUpdateDueDate}
        />

        {!indent && (
          <button
            onClick={onAddSubtask}
            className="text-muted-foreground hover:text-primary transition-colors p-1 shrink-0"
            title="Add subtask"
          >
            <ListTree className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={onToggleExpand}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
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

/* ─── Main TaskList ─── */
const TaskList = ({ tasks, onChange }: TaskListProps) => {
  const [newTask, setNewTask] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openParents, setOpenParents] = useState<Set<string>>(new Set());

  const parentTasks = tasks.filter((t) => !t.parentTaskId);
  const getSubtasks = (parentId: string) => tasks.filter((t) => t.parentTaskId === parentId);

  const allLeafTasks = tasks.filter(t => {
    if (t.parentTaskId) return true;
    return !tasks.some(sub => sub.parentTaskId === t.id);
  });
  const completedCount = allLeafTasks.filter((t) => t.completed).length;
  const completionPercent = allLeafTasks.length > 0 ? (completedCount / allLeafTasks.length) * 100 : 0;

  const overdueCount = tasks.filter(t => getDueDateStatus(t.dueDate, t.completed) === "overdue").length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const addTask = () => {
    if (!newTask.trim()) return;
    onChange([
      ...tasks,
      { id: crypto.randomUUID(), title: newTask.trim(), notes: "", completed: false, parentTaskId: null, dueDate: null },
    ]);
    setNewTask("");
  };

  const addSubtask = (parentId: string) => {
    onChange([
      ...tasks,
      { id: crypto.randomUUID(), title: "", notes: "", completed: false, parentTaskId: parentId, dueDate: null },
    ]);
    setOpenParents((prev) => new Set(prev).add(parentId));
  };

  const toggleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));

    if (task.parentTaskId) {
      const siblings = updated.filter((t) => t.parentTaskId === task.parentTaskId);
      const allDone = siblings.every((t) => t.completed);
      updated = updated.map((t) =>
        t.id === task.parentTaskId ? { ...t, completed: allDone } : t
      );
    }

    if (!task.parentTaskId) {
      const newVal = !task.completed;
      const subtaskIds = new Set(tasks.filter((t) => t.parentTaskId === taskId).map((t) => t.id));
      updated = updated.map((t) => (subtaskIds.has(t.id) ? { ...t, completed: newVal } : t));
    }

    onChange(updated);
  };

  const removeTask = (taskId: string) => {
    onChange(tasks.filter((t) => t.id !== taskId && t.parentTaskId !== taskId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = parentTasks.findIndex((t) => t.id === active.id);
      const newIndex = parentTasks.findIndex((t) => t.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        const reordered = arrayMove(parentTasks, oldIndex, newIndex);
        const result: Task[] = [];
        for (const p of reordered) {
          result.push(p);
          result.push(...getSubtasks(p.id));
        }
        onChange(result);
      }
    }
  };

  const toggleParentOpen = (id: string) => {
    setOpenParents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Tasks</h2>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-destructive font-medium bg-destructive/10 px-1.5 py-0.5 rounded-md">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} overdue
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            {completedCount}/{allLeafTasks.length}
          </span>
        </div>
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
        <SortableContext items={parentTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {parentTasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tasks yet. Add one above.
              </p>
            )}
            {parentTasks.map((task) => {
              const subtasks = getSubtasks(task.id);
              const isParentOpen = openParents.has(task.id);
              const subtaskProgress = subtasks.length > 0
                ? `${subtasks.filter(s => s.completed).length}/${subtasks.length}`
                : null;

              return (
                <div key={task.id} className="space-y-1">
                  <SortableTask
                    task={task}
                    isExpanded={expandedId === task.id}
                    hasSubtasks={subtasks.length > 0}
                    subtasksOpen={isParentOpen}
                    onToggleSubtasks={() => toggleParentOpen(task.id)}
                    onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    onToggleComplete={() => toggleComplete(task.id)}
                    onRemove={() => removeTask(task.id)}
                    onUpdateTitle={(title) =>
                      onChange(tasks.map((t) => (t.id === task.id ? { ...t, title } : t)))
                    }
                    onUpdateNotes={(notes) =>
                      onChange(tasks.map((t) => (t.id === task.id ? { ...t, notes } : t)))
                    }
                    onUpdateDueDate={(dueDate) =>
                      onChange(tasks.map((t) => (t.id === task.id ? { ...t, dueDate } : t)))
                    }
                    onAddSubtask={() => addSubtask(task.id)}
                  />

                  {subtasks.length > 0 && !isParentOpen && (
                    <button
                      onClick={() => toggleParentOpen(task.id)}
                      className="ml-6 text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 py-0.5"
                    >
                      <ListTree className="h-3 w-3" />
                      {subtaskProgress} subtasks
                    </button>
                  )}

                  {isParentOpen && subtasks.map((sub) => (
                    <SortableTask
                      key={sub.id}
                      task={sub}
                      indent
                      isExpanded={expandedId === sub.id}
                      hasSubtasks={false}
                      subtasksOpen={false}
                      onToggleSubtasks={() => {}}
                      onToggleExpand={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                      onToggleComplete={() => toggleComplete(sub.id)}
                      onRemove={() => removeTask(sub.id)}
                      onUpdateTitle={(title) =>
                        onChange(tasks.map((t) => (t.id === sub.id ? { ...t, title } : t)))
                      }
                      onUpdateNotes={(notes) =>
                        onChange(tasks.map((t) => (t.id === sub.id ? { ...t, notes } : t)))
                      }
                      onUpdateDueDate={(dueDate) =>
                        onChange(tasks.map((t) => (t.id === sub.id ? { ...t, dueDate } : t)))
                      }
                      onAddSubtask={() => {}}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default TaskList;
