import { useState } from "react";
import { ChangeOrder } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

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
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">Change Orders & Notes</h2>
      <div className="flex gap-2">
        <textarea
          placeholder="Add a note, change order, or contractor instruction…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[60px] focus:ring-1 focus:ring-ring"
        />
      </div>
      <Button size="sm" onClick={add} className="w-full">
        <Plus className="h-4 w-4 mr-1.5" />
        Add Note
      </Button>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">No notes yet.</p>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="rounded-lg border bg-background p-3 flex gap-3">
              <div className="flex-1 space-y-1">
                <p className="text-sm text-foreground whitespace-pre-wrap">{order.text}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => remove(order.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 self-start">
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
