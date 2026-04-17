import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, DollarSign, Receipt } from "lucide-react";

export interface Invoice {
  id: string;
  type: "homeowner" | "subcontractor";
  description: string;
  amount: number;
  paid: boolean;
}

interface InvoicesSectionProps {
  invoices: Invoice[];
  onChange: (invoices: Invoice[]) => void;
  totalBudget: number;
  totalSpent: number;
  readOnly?: boolean;
}

const InvoicesSection = ({ invoices, onChange, totalBudget, totalSpent, readOnly }: InvoicesSectionProps) => {
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"homeowner" | "subcontractor">("homeowner");

  const owedByHomeowner = invoices.filter(i => i.type === "homeowner" && !i.paid).reduce((s, i) => s + i.amount, 0);
  const owedToSubs = invoices.filter(i => i.type === "subcontractor" && !i.paid).reduce((s, i) => s + i.amount, 0);
  const remaining = totalBudget - totalSpent;

  const handleAdd = () => {
    const amt = Number(amount);
    if (!desc.trim() || !amt) return;
    onChange([...invoices, { id: crypto.randomUUID(), type, description: desc.trim(), amount: amt, paid: false }]);
    setDesc("");
    setAmount("");
  };

  const togglePaid = (id: string) => {
    onChange(invoices.map(i => i.id === id ? { ...i, paid: !i.paid } : i));
  };

  const remove = (id: string) => {
    onChange(invoices.filter(i => i.id !== id));
  };

  return (
    <div className="premium-card p-6 space-y-5">
      <h2 className="section-title flex items-center gap-2">
        <Receipt className="h-4 w-4 text-primary" />
        Invoices & Financials
      </h2>

      {/* Financial summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Budget</p>
          <p className="font-heading text-lg font-bold text-foreground mt-1.5">${totalBudget.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Spent</p>
          <p className="font-heading text-lg font-bold text-foreground mt-1.5">${totalSpent.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Remaining</p>
          <p className={`font-heading text-lg font-bold mt-1.5 ${remaining < 0 ? "text-destructive" : "text-foreground"}`}>${remaining.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-primary/20 bg-accent/50 p-4">
          <p className="text-[10px] text-accent-foreground/70 uppercase tracking-wider font-medium">Owed by HO</p>
          <p className="font-heading text-lg font-bold text-accent-foreground mt-1.5">${owedByHomeowner.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-[10px] text-warning uppercase tracking-wider font-medium">Owed to Subs</p>
          <p className="font-heading text-lg font-bold text-warning mt-1.5">${owedToSubs.toLocaleString()}</p>
        </div>
      </div>

      {/* Add invoice */}
      {!readOnly && (
        <div className="flex gap-2 flex-wrap">
          <Select value={type} onValueChange={(v) => setType(v as any)}>
            <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="homeowner">Homeowner</SelectItem>
              <SelectItem value="subcontractor">Subcontractor</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Description…" value={desc} onChange={e => setDesc(e.target.value)} className="flex-1 min-w-[120px] h-9 text-sm rounded-xl" />
          <div className="relative">
            <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input type="number" min={0} placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="w-24 h-9 text-sm pl-7 rounded-xl" />
          </div>
          <Button size="sm" className="h-9 rounded-xl" onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
        </div>
      )}

      {/* Invoice list */}
      {invoices.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No invoices yet.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {invoices.map(inv => (
            <div key={inv.id} className={`flex items-center gap-3 rounded-xl border p-3 text-sm transition-all duration-150 ${inv.paid ? "bg-muted/30 opacity-60" : "bg-background hover:shadow-sm"}`}>
              {!readOnly && (
                <Checkbox checked={inv.paid} onCheckedChange={() => togglePaid(inv.id)} />
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${inv.type === "homeowner" ? "bg-accent text-accent-foreground" : "bg-warning/10 text-warning"}`}>
                {inv.type === "homeowner" ? "HO" : "SUB"}
              </span>
              <span className={`flex-1 truncate ${inv.paid ? "line-through" : ""}`}>{inv.description}</span>
              <span className="font-heading font-semibold text-foreground">${inv.amount.toLocaleString()}</span>
              {!readOnly && (
                <button onClick={() => remove(inv.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoicesSection;
