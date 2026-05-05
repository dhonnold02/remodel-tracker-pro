import { uuidv4 } from "@/lib/uuid";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, DollarSign, Receipt } from "lucide-react";
import EmptyState from "@/components/EmptyState";

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
    onChange([...invoices, { id: uuidv4(), type, description: desc.trim(), amount: amt, paid: false }]);
    setDesc("");
    setAmount("");
  };

  const togglePaid = (id: string) => {
    onChange(invoices.map(i => i.id === id ? { ...i, paid: !i.paid } : i));
  };

  const remove = (id: string) => {
    onChange(invoices.filter(i => i.id !== id));
  };

  const formatCompact = (n: number) => {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(0)}K`;
    return `${sign}$${abs}`;
  };

  return (
    <div className="space-y-4">
      {/* Add invoice form */}
      {!readOnly && (
        <div className="bg-white border border-[hsl(214_13%_90%)] rounded-xl p-3 flex gap-2 flex-wrap items-center">
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="w-[140px] h-9 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="homeowner">Homeowner</SelectItem>
                <SelectItem value="subcontractor">Subcontractor</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Invoice description..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="flex-1 min-w-[160px] h-9 text-sm rounded-lg"
            />
            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-28 h-9 text-sm pl-7 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          <Button
            size="sm"
            className="rounded-lg text-xs h-9"
            onClick={handleAdd}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Invoice
          </Button>
        </div>
      )}

      {/* Invoice list */}
      {invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" description="Track invoices owed to/from homeowner and subs." />
      ) : (
        <div className="bg-white border border-[hsl(214_13%_90%)] rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px_90px_140px] gap-3 px-4 py-2 border-b border-[hsl(214_13%_90%)] bg-[hsl(210_20%_98%)] text-xs uppercase tracking-wider text-muted-foreground">
            <span>Description</span>
            <span>Type</span>
            <span className="text-right">Amount</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-[hsl(214_13%_90%)]">
            {invoices.map(inv => (
              <div key={inv.id} className="grid grid-cols-[1fr_100px_100px_90px_140px] gap-3 px-4 py-3 items-center text-sm">
                <span className={`truncate ${inv.paid ? "line-through text-muted-foreground" : "text-foreground"}`}>{inv.description}</span>
                <span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${inv.type === "homeowner" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                    {inv.type === "homeowner" ? "HO" : "Sub"}
                  </span>
                </span>
                <span className="font-semibold text-foreground tabular-nums text-right">${inv.amount.toLocaleString()}</span>
                <span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${inv.paid ? "bg-green-50 text-green-700 border border-green-200" : "bg-slate-100 text-slate-600"}`}>
                    {inv.paid ? "Paid" : "Open"}
                  </span>
                </span>
                <div className="flex items-center justify-end gap-2">
                  {!readOnly && (
                    <>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                        <Checkbox checked={inv.paid} onCheckedChange={() => togglePaid(inv.id)} />
                        Paid
                      </label>
                      <button onClick={() => remove(inv.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoicesSection;
