import { useState, useMemo } from "react";
import { Task, TaskPriority } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, isPast, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, ChevronDown, ChevronRight, GripVertical,
  CalendarIcon, AlertTriangle, X, MoreHorizontal, Pencil, ListTree, FileDown,
} from "lucide-react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent, DragOverEvent, DragStartEvent,
  pointerWithin, useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable,
  verticalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { exportTasksPDF } from "@/lib/exportTasksPDF";
import { useBranding } from "@/hooks/useBranding";

const DEFAULT_PHASES = ["Demo", "Framing", "Electrical", "Plumbing", "Finish"];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; cls: string; dot: string }> = {
  high: { label: "High", cls: "text-red-600 bg-red-500/10", dot: "bg-red-500" },
  medium: { label: "Med", cls: "text-amber-600 bg-amber-500/10", dot: "bg-amber-500" },
  low: { label: "Low", cls: "text-blue-500 bg-blue-500/10", dot: "bg-blue-500" },
};

// Stable color per phase index — uses HSL with golden ratio for nice variation
const phaseColor = (i: number) => {
  const hue = (i * 53) % 360;
  return {
    bar: `hsl(${hue} 70% 55%)`,
    soft: `hsl(${hue} 80% 96%)`,
  };
};

const getDueDateStatus = (dueDate?: string | null, completed?: boolean) => {
  if (!dueDate || completed) return null;
  try {
    const d = parseISO(dueDate);
    if (isPast(d) && !isToday(d)) return "overdue";
    if (isToday(d)) return "today";
    return null;
  } catch { return null; }
};

/* ────── Card ────── */
interface TaskCardProps {
  task: Task;
  subtasks: Task[];
  isEditor: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleComplete: (id: string) => void;
  onUpdate: (id: string, partial: Partial<Task>) => void;
  onAddSubtask: (parentId: string) => void;
  onRemove: (id: string) => void;
  isOverlay?: boolean;
}

const TaskCard = ({
  task, subtasks, isEditor, expanded, onToggleExpand,
  onToggleComplete, onUpdate, onAddSubtask, onRemove, isOverlay,
}: TaskCardProps) => {
  const sortable = useSortable({
    id: task.id,
    data: { type: "task", phase: task.phase || "General" },
    disabled: !isEditor,
  });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const status = getDueDateStatus(task.dueDate, task.completed);
  const completedSubs = subtasks.filter((s) => s.completed).length;

  const style = isOverlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group rounded-xl bg-card p-3 space-y-2 ring-1 ring-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-md hover:-translate-y-0.5 hover:ring-border transition-all duration-200",
        status === "overdue" && !task.completed && "ring-destructive/40",
        isOverlay && "shadow-2xl rotate-2 ring-2 ring-primary/30 cursor-grabbing",
        task.completed && "opacity-70",
      )}
    >
      <div className="flex items-start gap-2">
        {isEditor && (
          <button
            className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-foreground transition-colors mt-0.5 -ml-1 p-0.5"
            {...attributes}
            {...listeners}
            aria-label="Drag task"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => isEditor && onToggleComplete(task.id)}
          disabled={!isEditor}
          className="mt-0.5"
        />
        <input
          value={task.title}
          onChange={(e) => onUpdate(task.id, { title: e.target.value })}
          placeholder="Task title…"
          readOnly={!isEditor}
          className={cn(
            "flex-1 bg-transparent text-sm outline-none font-medium leading-snug min-w-0",
            task.completed ? "line-through text-muted-foreground" : "text-foreground",
          )}
        />
        {isEditor && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition p-0.5">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onAddSubtask(task.id)}>
                <ListTree className="h-3.5 w-3.5 mr-2" /> Add subtask
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleExpand}>
                {expanded ? <ChevronDown className="h-3.5 w-3.5 mr-2" /> : <ChevronRight className="h-3.5 w-3.5 mr-2" />}
                {expanded ? "Collapse" : "Expand"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRemove(task.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center flex-wrap gap-1.5 pl-7">
        <Popover>
          <PopoverTrigger asChild>
            <button
              disabled={!isEditor}
              className={cn("flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-medium", PRIORITY_CONFIG[task.priority].cls)}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_CONFIG[task.priority].dot)} />
              {PRIORITY_CONFIG[task.priority].label}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-28 p-1" align="start">
            {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
              <button
                key={p}
                onClick={() => onUpdate(task.id, { priority: p })}
                className={cn("w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md hover:bg-secondary transition-colors", p === task.priority && "bg-secondary")}
              >
                <span className={cn("h-2 w-2 rounded-full", PRIORITY_CONFIG[p].dot)} />
                {PRIORITY_CONFIG[p].label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button
              disabled={!isEditor}
              className={cn(
                "flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md transition-colors",
                status === "overdue" ? "text-destructive bg-destructive/10 font-medium"
                  : status === "today" ? "text-amber-600 bg-amber-500/10 font-medium"
                  : task.dueDate ? "text-muted-foreground bg-secondary"
                  : "text-muted-foreground/60 hover:text-muted-foreground",
              )}
            >
              {status === "overdue" && <AlertTriangle className="h-3 w-3" />}
              <CalendarIcon className="h-3 w-3" />
              {task.dueDate ? format(parseISO(task.dueDate), "MMM d") : "Due"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={task.dueDate ? parseISO(task.dueDate) : undefined}
              onSelect={(d) => onUpdate(task.id, { dueDate: d ? format(d, "yyyy-MM-dd") : null })}
              className="p-3 pointer-events-auto"
            />
            {task.dueDate && (
              <div className="px-3 pb-2">
                <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => onUpdate(task.id, { dueDate: null })}>
                  Clear due date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {subtasks.length > 0 && (
          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground bg-secondary px-1.5 py-0.5 rounded-md"
          >
            <ListTree className="h-3 w-3" />
            {completedSubs}/{subtasks.length}
          </button>
        )}

        {task.tags.slice(0, 2).map((t) => (
          <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0 h-4">{t}</Badge>
        ))}
      </div>

      {/* Subtasks */}
      {expanded && subtasks.length > 0 && (
        <div className="pl-7 pt-1 space-y-1 border-t mt-2">
          {subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-2 py-1">
              <Checkbox
                checked={s.completed}
                onCheckedChange={() => isEditor && onToggleComplete(s.id)}
                disabled={!isEditor}
                className="h-3.5 w-3.5"
              />
              <input
                value={s.title}
                onChange={(e) => onUpdate(s.id, { title: e.target.value })}
                readOnly={!isEditor}
                placeholder="Subtask…"
                className={cn(
                  "flex-1 bg-transparent text-xs outline-none min-w-0",
                  s.completed ? "line-through text-muted-foreground" : "text-foreground",
                )}
              />
              {isEditor && (
                <button onClick={() => onRemove(s.id)} className="text-muted-foreground/50 hover:text-destructive transition opacity-0 group-hover:opacity-100">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {isEditor && (
            <button
              onClick={() => onAddSubtask(task.id)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary mt-1"
            >
              <Plus className="h-3 w-3" /> Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ────── Phase Column ────── */
interface PhaseColumnProps {
  phase: string;
  index: number;
  tasks: Task[];
  allTasks: Task[];
  isEditor: boolean;
  collapsed: boolean;
  expandedTaskId: string | null;
  onToggleCollapse: () => void;
  onToggleExpandTask: (id: string) => void;
  onAddTask: (phase: string, title: string) => void;
  onRenamePhase: (oldName: string, newName: string) => void;
  onDeletePhase: (phase: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateTask: (id: string, partial: Partial<Task>) => void;
  onAddSubtask: (parentId: string) => void;
  onRemoveTask: (id: string) => void;
  isFirst: boolean;
}

const PhaseColumn = ({
  phase, index, tasks, allTasks, isEditor, collapsed, expandedTaskId,
  onToggleCollapse, onToggleExpandTask, onAddTask, onRenamePhase, onDeletePhase,
  onToggleComplete, onUpdateTask, onAddSubtask, onRemoveTask, isFirst,
}: PhaseColumnProps) => {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(phase);

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `phase-${phase}`,
    data: { type: "phase", phase },
  });

  const parentTasks = tasks.filter((t) => !t.parentTaskId);
  const allLeaf = tasks.filter(t => !allTasks.some(c => c.parentTaskId === t.id));
  const completedCount = allLeaf.filter(t => t.completed).length;
  const percent = allLeaf.length > 0 ? (completedCount / allLeaf.length) * 100 : 0;
  const color = phaseColor(index);

  const handleAdd = () => {
    if (!newTitle.trim()) { setAdding(false); return; }
    onAddTask(phase, newTitle.trim());
    setNewTitle("");
  };

  const handleRename = () => {
    const v = renameValue.trim();
    if (v && v !== phase) onRenamePhase(phase, v);
    setRenaming(false);
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl bg-muted/40 transition-all shrink-0 ring-1 ring-border/40",
        collapsed ? "w-14" : "w-72 sm:w-80",
        isOver && "ring-2 ring-primary/50 bg-primary/5",
      )}
    >
      {/* Sticky phase header */}
      <div
        className="sticky top-0 z-10 rounded-t-2xl bg-muted/40 backdrop-blur-sm px-4 pt-3 pb-3"
      >
        {collapsed ? (
          <button onClick={onToggleCollapse} className="flex flex-col items-center gap-2 w-full py-2" title={phase}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span
              className="text-xs font-semibold text-foreground"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {phase} · {parentTasks.length}
            </span>
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: color.bar }}
                aria-hidden
              />
              <button
                onClick={onToggleCollapse}
                className="text-muted-foreground hover:text-foreground transition p-0.5 -ml-1"
                title="Collapse phase"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              {renaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename();
                    if (e.key === "Escape") { setRenameValue(phase); setRenaming(false); }
                  }}
                  className="flex-1 bg-background border rounded-md px-2 py-0.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30 min-w-0"
                />
              ) : (
                <h3
                  className="flex-1 text-sm font-heading font-bold text-foreground tracking-tight truncate uppercase"
                  style={{ letterSpacing: "0.02em" }}
                  onDoubleClick={() => isEditor && setRenaming(true)}
                  title={isEditor ? "Double-click to rename" : phase}
                >
                  {phase}
                </h3>
              )}
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums px-1.5 py-0.5 rounded-md bg-background/80">
                {parentTasks.length}
              </span>
              {isEditor && !renaming && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition p-0.5">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => { setRenameValue(phase); setRenaming(true); }}>
                      <Pencil className="h-3.5 w-3.5 mr-2" /> Rename phase
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setAdding(true); }}>
                      <Plus className="h-3.5 w-3.5 mr-2" /> Add task
                    </DropdownMenuItem>
                    {!isFirst && (
                      <>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} asChild>
                            <button className="w-full text-left flex items-center text-destructive focus:text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete phase
                            </button>
                          </DropdownMenuItem>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{phase}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {tasks.length > 0
                                  ? `Tasks in this phase will be moved to the first phase. This cannot be undone.`
                                  : "This phase will be removed from the board."}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDeletePhase(phase)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {/* Progress */}
            <div className="mt-2.5 space-y-1 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{completedCount}/{allLeaf.length} done</span>
                <span className="tabular-nums">{Math.round(percent)}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-background/70 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${percent}%`, background: color.bar }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cards droppable area */}
      {!collapsed && (
        <div
          ref={setDropRef}
          className="flex-1 px-3 pt-2 pb-3 space-y-2.5 min-h-[160px]"
        >
          <SortableContext items={parentTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {parentTasks.length === 0 && !adding && (
              <div className="text-[11px] text-muted-foreground/70 italic text-center py-6 px-3 rounded-lg border border-dashed">
                Drop tasks here
              </div>
            )}
            {parentTasks.map((task) => {
              const subs = allTasks.filter((s) => s.parentTaskId === task.id);
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  subtasks={subs}
                  isEditor={isEditor}
                  expanded={expandedTaskId === task.id}
                  onToggleExpand={() => onToggleExpandTask(task.id)}
                  onToggleComplete={onToggleComplete}
                  onUpdate={onUpdateTask}
                  onAddSubtask={onAddSubtask}
                  onRemove={onRemoveTask}
                />
              );
            })}
          </SortableContext>

          {/* Add task */}
          {isEditor && (
            adding ? (
              <div className="rounded-xl border bg-card p-2 space-y-2 shadow-sm animate-fade-in">
                <Input
                  autoFocus
                  placeholder="Task title…"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
                  }}
                  className="h-8 text-sm"
                />
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={handleAdd} className="h-7 text-xs flex-1">Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewTitle(""); }} className="h-7 text-xs">Cancel</Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 py-2 rounded-lg transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add task
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

/* ────── Main Board ────── */
interface TaskBoardProps {
  tasks: Task[];
  phases: string[];
  onChangeTasks: (tasks: Task[]) => void;
  onChangePhases: (phases: string[]) => void;
  isEditor: boolean;
  projectName?: string;
  projectAddress?: string;
}

const TaskBoard = ({ tasks, phases, onChangeTasks, onChangePhases, isEditor, projectName, projectAddress }: TaskBoardProps) => {
  const { brand } = useBranding();
  const effectivePhases = useMemo(() => {
    const base = phases && phases.length > 0 ? [...phases] : [...DEFAULT_PHASES];
    // Ensure any phase referenced by an existing task is included (legacy / "General")
    for (const t of tasks) {
      const p = t.phase || "General";
      if (!base.includes(p)) base.push(p);
    }
    return base;
  }, [phases, tasks]);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingPhase, setAddingPhase] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tasksByPhase = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const p of effectivePhases) map[p] = [];
    for (const t of tasks) {
      const p = t.phase || "General";
      if (!map[p]) map[p] = [];
      map[p].push(t);
    }
    return map;
  }, [tasks, effectivePhases]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const activeSubs = activeTask ? tasks.filter(t => t.parentTaskId === activeTask.id) : [];

  /* ──── Mutations ──── */
  const updateTask = (id: string, partial: Partial<Task>) => {
    onChangeTasks(tasks.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  };

  const toggleComplete = (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    let next = tasks.map((x) => (x.id === id ? { ...x, completed: !x.completed } : x));
    // If parent toggled, cascade to subs
    if (!t.parentTaskId) {
      const newVal = !t.completed;
      const subIds = new Set(tasks.filter(x => x.parentTaskId === id).map(x => x.id));
      next = next.map(x => subIds.has(x.id) ? { ...x, completed: newVal } : x);
    } else {
      // If sub toggled, check if all siblings now done
      const siblings = next.filter(x => x.parentTaskId === t.parentTaskId);
      const allDone = siblings.every(x => x.completed);
      next = next.map(x => x.id === t.parentTaskId ? { ...x, completed: allDone } : x);
    }
    onChangeTasks(next);
  };

  const addTask = (phase: string, title: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title, notes: "", completed: false,
      parentTaskId: null, dueDate: null, priority: "medium", tags: [], phase,
    };
    onChangeTasks([...tasks, newTask]);
  };

  const addSubtask = (parentId: string) => {
    const parent = tasks.find(t => t.id === parentId);
    const newSub: Task = {
      id: crypto.randomUUID(),
      title: "", notes: "", completed: false,
      parentTaskId: parentId, dueDate: null, priority: "medium", tags: [],
      phase: parent?.phase || "General",
    };
    onChangeTasks([...tasks, newSub]);
    setExpandedTaskId(parentId);
  };

  const removeTask = (id: string) => {
    onChangeTasks(tasks.filter((t) => t.id !== id && t.parentTaskId !== id));
  };

  /* ──── Phase mutations ──── */
  const renamePhase = (oldName: string, newName: string) => {
    if (effectivePhases.includes(newName)) return; // avoid collision
    onChangePhases(effectivePhases.map((p) => (p === oldName ? newName : p)));
    onChangeTasks(tasks.map((t) => ((t.phase || "General") === oldName ? { ...t, phase: newName } : t)));
  };

  const deletePhase = (phase: string) => {
    const remaining = effectivePhases.filter(p => p !== phase);
    if (remaining.length === 0) return;
    const fallback = remaining[0];
    onChangePhases(remaining);
    onChangeTasks(tasks.map((t) => ((t.phase || "General") === phase ? { ...t, phase: fallback } : t)));
  };

  const addPhase = () => {
    const v = newPhaseName.trim();
    if (!v || effectivePhases.includes(v)) { setAddingPhase(false); setNewPhaseName(""); return; }
    onChangePhases([...effectivePhases, v]);
    setNewPhaseName("");
    setAddingPhase(false);
  };

  /* ──── Drag handling ──── */
  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (_e: DragOverEvent) => { /* visual only */ };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask || activeTask.parentTaskId) return; // only top-level cards are draggable on the board

    const overId = String(over.id);
    let targetPhase: string;
    let beforeTaskId: string | null = null; // insert before this parent id, or null = append to phase

    if (overId.startsWith("phase-")) {
      targetPhase = overId.slice("phase-".length);
    } else {
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;
      targetPhase = overTask.phase || "General";
      // If hovering a sub-task, anchor to its parent
      beforeTaskId = overTask.parentTaskId || overTask.id;
      if (beforeTaskId === active.id) return;
    }

    // Pull moved parent + its subs out of the list
    const movedSubs = tasks
      .filter((t) => t.parentTaskId === active.id)
      .map((s) => ({ ...s, phase: targetPhase }));
    const movedParent: Task = { ...activeTask, phase: targetPhase };
    const remaining = tasks.filter((t) => t.id !== active.id && t.parentTaskId !== active.id);

    // Re-insert at the correct position
    let next: Task[];
    if (beforeTaskId) {
      const insertAt = remaining.findIndex((t) => t.id === beforeTaskId);
      if (insertAt === -1) {
        next = [...remaining, movedParent, ...movedSubs];
      } else {
        next = [
          ...remaining.slice(0, insertAt),
          movedParent,
          ...movedSubs,
          ...remaining.slice(insertAt),
        ];
      }
    } else {
      // Append to end of target phase block — find last index of any task in that phase
      let lastIdx = -1;
      for (let i = remaining.length - 1; i >= 0; i--) {
        if ((remaining[i].phase || "General") === targetPhase) { lastIdx = i; break; }
      }
      if (lastIdx === -1) {
        next = [...remaining, movedParent, ...movedSubs];
      } else {
        next = [
          ...remaining.slice(0, lastIdx + 1),
          movedParent,
          ...movedSubs,
          ...remaining.slice(lastIdx + 1),
        ];
      }
    }

    onChangeTasks(next);
  };

  const totalLeaf = tasks.filter(t => !tasks.some(c => c.parentTaskId === t.id));
  const totalDone = totalLeaf.filter(t => t.completed).length;
  const totalPercent = totalLeaf.length > 0 ? (totalDone / totalLeaf.length) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Board summary */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{totalDone}/{totalLeaf.length} tasks complete</span>
          <span className="text-foreground font-medium tabular-nums">{Math.round(totalPercent)}%</span>
          <div className="hidden sm:block w-32 h-1 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-success rounded-full transition-all duration-500" style={{ width: `${totalPercent}%` }} />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() =>
            exportTasksPDF({
              projectName: projectName || "Project",
              projectAddress,
              tasks,
              brandLogoUrl: brand.brandLogoUrl,
              brandName: brand.brandName,
            })
          }
          disabled={tasks.length === 0}
        >
          <FileDown className="h-3.5 w-3.5" />
          Export Tasks PDF
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        {/* Board background layer — columns float as lanes on top */}
        <div className="rounded-2xl bg-secondary/40 ring-1 ring-border/40 p-3 sm:p-4 md:p-5 overflow-x-auto">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch min-h-[200px]">
            {effectivePhases.map((phase, i) => (
              <PhaseColumn
                key={phase}
                phase={phase}
                index={i}
                tasks={tasksByPhase[phase] || []}
                allTasks={tasks}
                isEditor={isEditor}
                collapsed={collapsed.has(phase)}
                expandedTaskId={expandedTaskId}
                onToggleCollapse={() => setCollapsed(prev => {
                  const next = new Set(prev);
                  next.has(phase) ? next.delete(phase) : next.add(phase);
                  return next;
                })}
                onToggleExpandTask={(id) => setExpandedTaskId(prev => prev === id ? null : id)}
                onAddTask={addTask}
                onRenamePhase={renamePhase}
                onDeletePhase={deletePhase}
                onToggleComplete={toggleComplete}
                onUpdateTask={updateTask}
                onAddSubtask={addSubtask}
                onRemoveTask={removeTask}
                isFirst={i === 0}
              />
            ))}

            {/* Add phase column */}
            {isEditor && (
              <div className="w-72 sm:w-72 shrink-0">
                {addingPhase ? (
                  <div className="rounded-2xl border bg-card p-3 space-y-2 shadow-sm">
                    <Input
                      autoFocus
                      placeholder="Phase name…"
                      value={newPhaseName}
                      onChange={(e) => setNewPhaseName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addPhase();
                        if (e.key === "Escape") { setAddingPhase(false); setNewPhaseName(""); }
                      }}
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={addPhase} className="h-7 text-xs flex-1">Add phase</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAddingPhase(false); setNewPhaseName(""); }} className="h-7 text-xs">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingPhase(true)}
                    className="w-full h-full min-h-[120px] flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-2xl border-2 border-dashed hover:border-primary/40 hover:bg-secondary/30 transition-colors py-3"
                  >
                    <Plus className="h-4 w-4" /> Add phase
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard
              task={activeTask}
              subtasks={activeSubs}
              isEditor={false}
              expanded={false}
              onToggleExpand={() => {}}
              onToggleComplete={() => {}}
              onUpdate={() => {}}
              onAddSubtask={() => {}}
              onRemove={() => {}}
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default TaskBoard;