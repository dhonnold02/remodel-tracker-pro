import { useState, useMemo } from "react";
import { Task, TaskPriority } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProgressBar from "./ProgressBar";
import { format, isPast, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, ChevronDown, ChevronUp, ChevronRight,
  GripVertical, ListTree, CalendarIcon, AlertTriangle,
  Search, Filter, X, Tag,
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

/* ─── Priority config ─── */
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  high: { label: "High", color: "text-red-600 bg-red-500/10", dot: "bg-red-500" },
  medium: { label: "Med", color: "text-amber-600 bg-amber-500/10", dot: "bg-amber-500" },
  low: { label: "Low", color: "text-blue-500 bg-blue-500/10", dot: "bg-blue-500" },
};

/* ─── Due date helpers ─── */
const getDueDateStatus = (dueDate?: string | null, completed?: boolean) => {
  if (!dueDate || completed) return null;
  try {
    const date = parseISO(dueDate);
    if (isPast(date) && !isToday(date)) return "overdue";
    if (isToday(date)) return "today";
    return null;
  } catch { return null; }
};

/* ─── Priority selector ─── */
const PrioritySelector = ({ priority, onChange }: { priority: TaskPriority; onChange: (p: TaskPriority) => void }) => {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0", cfg.color)}>
          <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
          {cfg.label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-28 p-1" align="end">
        {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary transition-colors", p === priority && "bg-secondary")}
          >
            <span className={cn("h-2 w-2 rounded-full", PRIORITY_CONFIG[p].dot)} />
            {PRIORITY_CONFIG[p].label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

/* ─── Tag input ─── */
const TagInput = ({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) => {
  const [input, setInput] = useState("");
  const addTag = () => {
    const tag = input.trim().toLowerCase();
    if (tag && !tags.includes(tag)) { onChange([...tags, tag]); }
    setInput("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 h-5">
          {t}
          <button onClick={() => onChange(tags.filter((x) => x !== t))} className="hover:text-destructive"><X className="h-2.5 w-2.5" /></button>
        </Badge>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
        onBlur={addTag}
        placeholder="+ tag"
        className="text-[10px] bg-transparent outline-none w-12 text-muted-foreground placeholder:text-muted-foreground/50"
      />
    </div>
  );
};

/* ─── Due date picker ─── */
const DueDatePicker = ({ dueDate, completed, onChange }: { dueDate?: string | null; completed: boolean; onChange: (date: string | null) => void }) => {
  const status = getDueDateStatus(dueDate, completed);
  const parsed = dueDate ? parseISO(dueDate) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn(
          "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md transition-colors shrink-0",
          status === "overdue" ? "text-destructive bg-destructive/10 font-medium"
            : status === "today" ? "text-amber-600 bg-amber-500/10 font-medium"
            : dueDate ? "text-muted-foreground hover:text-foreground"
            : "text-muted-foreground/50 hover:text-muted-foreground"
        )}>
          {status === "overdue" && <AlertTriangle className="h-3 w-3" />}
          <CalendarIcon className="h-3 w-3" />
          {dueDate ? format(parsed!, "MMM d") : "Due"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar mode="single" selected={parsed} onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)} className="p-3 pointer-events-auto" />
        {dueDate && (
          <div className="px-3 pb-2">
            <Button variant="ghost" size="sm" className="w-full text-xs h-7 text-muted-foreground" onClick={() => onChange(null)}>Clear due date</Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

/* ─── Sortable task row ─── */
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
  onUpdate: (partial: Partial<Task>) => void;
  onAddSubtask: () => void;
}

const SortableTask = ({
  task, isExpanded, indent, hasSubtasks, subtasksOpen,
  onToggleSubtasks, onToggleExpand, onToggleComplete,
  onRemove, onUpdate, onAddSubtask,
}: SortableTaskProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined };
  const status = getDueDateStatus(task.dueDate, task.completed);

  return (
    <div ref={setNodeRef} style={style} className={cn(
      "rounded-lg border bg-background p-3 space-y-2",
      indent && "ml-6 border-l-2 border-l-primary/20",
      status === "overdue" && "border-destructive/40",
    )}>
      <div className="flex items-center gap-2">
        <button className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4" />
        </button>
        {!indent && hasSubtasks && (
          <button onClick={onToggleSubtasks} className="text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0">
            {subtasksOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
        <Checkbox checked={task.completed} onCheckedChange={onToggleComplete} />
        <input
          value={task.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder={indent ? "Subtask title…" : "Task title…"}
          className={cn("flex-1 bg-transparent text-sm outline-none font-body min-w-0", task.completed ? "line-through text-muted-foreground" : "text-foreground")}
        />
        <PrioritySelector priority={task.priority} onChange={(priority) => onUpdate({ priority })} />
        <DueDatePicker dueDate={task.dueDate} completed={task.completed} onChange={(dueDate) => onUpdate({ dueDate })} />
        {!indent && (
          <button onClick={onAddSubtask} className="text-muted-foreground hover:text-primary transition-colors p-1 shrink-0" title="Add subtask">
            <ListTree className="h-4 w-4" />
          </button>
        )}
        <button onClick={onToggleExpand} className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {isExpanded && (
        <div className="space-y-2">
          <textarea
            placeholder="Add notes…"
            value={task.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            className="w-full text-sm bg-secondary rounded-md p-2 outline-none resize-none text-foreground placeholder:text-muted-foreground min-h-[60px]"
          />
          <div className="flex items-center gap-1.5">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <TagInput tags={task.tags} onChange={(tags) => onUpdate({ tags })} />
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Filter bar ─── */
type FilterStatus = "all" | "pending" | "completed";
type FilterPriority = "all" | TaskPriority;

/* ─── Main TaskList ─── */
const TaskList = ({ tasks, onChange }: TaskListProps) => {
  const [newTask, setNewTask] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openParents, setOpenParents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterPriority, setFilterPriority] = useState<FilterPriority>("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.notes.toLowerCase().includes(q) && !t.tags.some(tag => tag.includes(q))) return false;
      }
      if (filterStatus === "completed" && !t.completed) return false;
      if (filterStatus === "pending" && t.completed) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, searchQuery, filterStatus, filterPriority]);

  const parentTasks = filteredTasks.filter((t) => !t.parentTaskId);
  const getSubtasks = (parentId: string) => filteredTasks.filter((t) => t.parentTaskId === parentId);

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

  const makeTask = (title: string, parentTaskId: string | null = null): Task => ({
    id: crypto.randomUUID(), title, notes: "", completed: false, parentTaskId, dueDate: null, priority: "medium", tags: [],
  });

  const addTask = () => {
    if (!newTask.trim()) return;
    onChange([...tasks, makeTask(newTask.trim())]);
    setNewTask("");
  };

  const addSubtask = (parentId: string) => {
    onChange([...tasks, makeTask("", parentId)]);
    setOpenParents((prev) => new Set(prev).add(parentId));
  };

  const updateTask = (taskId: string, partial: Partial<Task>) => {
    onChange(tasks.map((t) => (t.id === taskId ? { ...t, ...partial } : t)));
  };

  const toggleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    let updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    if (task.parentTaskId) {
      const siblings = updated.filter((t) => t.parentTaskId === task.parentTaskId);
      const allDone = siblings.every((t) => t.completed);
      updated = updated.map((t) => t.id === task.parentTaskId ? { ...t, completed: allDone } : t);
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
      const allParents = tasks.filter(t => !t.parentTaskId);
      const oldIndex = allParents.findIndex((t) => t.id === active.id);
      const newIndex = allParents.findIndex((t) => t.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        const reordered = arrayMove(allParents, oldIndex, newIndex);
        const result: Task[] = [];
        for (const p of reordered) {
          result.push(p);
          result.push(...tasks.filter(t => t.parentTaskId === p.id));
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

  const hasActiveFilters = filterStatus !== "all" || filterPriority !== "all" || searchQuery !== "";

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Tasks</h2>
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-destructive font-medium bg-destructive/10 px-1.5 py-0.5 rounded-md">
              <AlertTriangle className="h-3 w-3" />{overdueCount} overdue
            </span>
          )}
          <span className="text-sm text-muted-foreground">{completedCount}/{allLeafTasks.length}</span>
        </div>
      </div>

      <ProgressBar label="Completion" value={completionPercent} variant="completion" />

      {/* Search & Filter bar */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button
            variant={hasActiveFilters ? "default" : "outline"}
            size="sm"
            className="h-9 shrink-0"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3.5 w-3.5 mr-1" />
            Filter
          </Button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 p-2 rounded-lg bg-secondary/50">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as FilterPriority)}>
              <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">🔴 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🔵 Low</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFilterStatus("all"); setFilterPriority("all"); setSearchQuery(""); }}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Input placeholder="Add a task…" value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} className="flex-1" />
        <Button size="icon" onClick={addTask} className="shrink-0"><Plus className="h-4 w-4" /></Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={parentTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {parentTasks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {hasActiveFilters ? "No tasks match your filters." : "No tasks yet. Add one above."}
              </p>
            )}
            {parentTasks.map((task) => {
              const subtasks = getSubtasks(task.id);
              const allSubtasks = tasks.filter(t => t.parentTaskId === task.id);
              const isParentOpen = openParents.has(task.id);
              const subtaskProgress = allSubtasks.length > 0 ? `${allSubtasks.filter(s => s.completed).length}/${allSubtasks.length}` : null;

              return (
                <div key={task.id} className="space-y-1">
                  <SortableTask
                    task={task}
                    isExpanded={expandedId === task.id}
                    hasSubtasks={allSubtasks.length > 0}
                    subtasksOpen={isParentOpen}
                    onToggleSubtasks={() => toggleParentOpen(task.id)}
                    onToggleExpand={() => setExpandedId(expandedId === task.id ? null : task.id)}
                    onToggleComplete={() => toggleComplete(task.id)}
                    onRemove={() => removeTask(task.id)}
                    onUpdate={(partial) => updateTask(task.id, partial)}
                    onAddSubtask={() => addSubtask(task.id)}
                  />
                  {allSubtasks.length > 0 && !isParentOpen && (
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
                      onUpdate={(partial) => updateTask(sub.id, partial)}
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
