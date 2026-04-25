import { useState } from "react";
import { ChangeOrder } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ClipboardList } from "lucide-react";

interface ChangeOrdersProps {
  orders: ChangeOrder[];
  onChange: (orders: ChangeOrder[]) => void;
}

const ChangeOrdersSection = ({ orders, onChange }: ChangeOrdersProps) => {
  const [draft, setDraft] = useState("");

  const add = () => {
    if (!draft.trim()) return;
    onChange([
      { id: crypto.randomUUID(), text: draft.trim(), createdAt: new Date().toISOString() },
      ...orders,
    ]);
    setDraft("");
  };

  const remove = (id: string) => onChange(orders.filter((o) => o.id !== id));

  return (
    <div className="premium-card p-6 space-y-5">
      <h2 className="section-title flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        Change Orders & Notes
      </h2>

      <div className="space-y-3">
        <textarea
          placeholder="Add a note, change order, or contractor instruction…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[72px] focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background transition-shadow"
        />
        <Button size="sm" onClick={add} className="w-full rounded-xl">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Note
        </Button>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="rounded-xl border bg-background p-4 flex gap-3 hover:shadow-sm transition-shadow duration-150">
              <div className="flex-1 space-y-1.5">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{order.text}</p>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => remove(order.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 self-start shrink-0">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChangeOrdersSection;
