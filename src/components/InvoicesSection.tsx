import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
        <Receipt className="h-5 w-5 text-primary" />
        Invoices & Financials
      </h2>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div className="rounded-lg bg-secondary p-3 text-center">
          <p className="text-xs text-muted-foreground">Budget</p>
          <p className="font-heading text-sm font-bold text-foreground">${totalBudget.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-secondary p-3 text-center">
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="font-heading text-sm font-bold text-foreground">${totalSpent.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-secondary p-3 text-center">
          <p className="text-xs text-muted-foreground">Remaining</p>
          <p className={`font-heading text-sm font-bold ${remaining < 0 ? "text-destructive" : "text-foreground"}`}>${remaining.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-blue-500/10 p-3 text-center">
          <p className="text-xs text-muted-foreground">Owed by Homeowner</p>
          <p className="font-heading text-sm font-bold text-blue-600">${owedByHomeowner.toLocaleString()}</p>
        </div>
        <div className="rounded-lg bg-orange-500/10 p-3 text-center">
          <p className="text-xs text-muted-foreground">Owed to Subs</p>
          <p className="font-heading text-sm font-bold text-orange-600">${owedToSubs.toLocaleString()}</p>
        </div>
      </div>

      {/* Add invoice */}
      {!readOnly && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homeowner">Homeowner</SelectItem>
                <SelectItem value="subcontractor">Subcontractor</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Description…" value={desc} onChange={e => setDesc(e.target.value)} className="flex-1 h-9 text-sm" />
            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input type="number" min={0} placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} className="w-24 h-9 text-sm pl-7" />
            </div>
            <Button size="sm" className="h-9" onClick={handleAdd}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Invoice list */}
      {invoices.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No invoices yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {invoices.map(inv => (
            <div key={inv.id} className={`flex items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors ${inv.paid ? "bg-muted/50 opacity-60" : "bg-background"}`}>
              {!readOnly && (
                <Checkbox checked={inv.paid} onCheckedChange={() => togglePaid(inv.id)} />
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${inv.type === "homeowner" ? "bg-blue-500/10 text-blue-600" : "bg-orange-500/10 text-orange-600"}`}>
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
