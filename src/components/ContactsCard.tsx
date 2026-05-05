import { useState } from "react";
import { Users, Pencil, Phone, Mail, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DebouncedInput } from "@/components/inputs/DebouncedInput";

export interface ContactFields {
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  secondaryContactName: string;
  secondaryContactPhone: string;
  secondaryContactEmail: string;
}

interface Props {
  data: ContactFields;
  onChange: (partial: Partial<ContactFields>) => void;
  readOnly?: boolean;
}

type SlotKey = "primary" | "secondary";

const slotConfig: { key: SlotKey; label: string; nameField: keyof ContactFields; phoneField: keyof ContactFields; emailField: keyof ContactFields }[] = [
  { key: "primary", label: "Primary Contact", nameField: "primaryContactName", phoneField: "primaryContactPhone", emailField: "primaryContactEmail" },
  { key: "secondary", label: "Secondary Contact", nameField: "secondaryContactName", phoneField: "secondaryContactPhone", emailField: "secondaryContactEmail" },
];

const ContactsCard = ({ data, onChange, readOnly }: Props) => {
  const [editing, setEditing] = useState<Record<SlotKey, boolean>>({ primary: false, secondary: false });

  return (
    <div className="rounded-xl bg-card border border-[hsl(214_13%_90%)] p-6 space-y-5">
      <h2 className="section-title flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        Contacts
      </h2>
      <div className="space-y-5">
        {slotConfig.map((slot) => {
          const name = data[slot.nameField];
          const phone = data[slot.phoneField];
          const email = data[slot.emailField];
          const hasAny = !!(name || phone || email);
          const isEditing = editing[slot.key];

          return (
            <div key={slot.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground font-medium">{slot.label}</Label>
                {!readOnly && hasAny && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg"
                    onClick={() => setEditing((s) => ({ ...s, [slot.key]: !s[slot.key] }))}
                    aria-label={isEditing ? "Done editing" : "Edit contact"}
                  >
                    {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>

              {!hasAny && !isEditing ? (
                <div className="rounded-xl border border-dashed border-[hsl(214_13%_90%)] px-3 py-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">No contact added</span>
                  {!readOnly && (
                    <button
                      type="button"
                      className="text-sm text-primary font-medium hover:underline"
                      onClick={() => setEditing((s) => ({ ...s, [slot.key]: true }))}
                    >
                      + Add contact
                    </button>
                  )}
                </div>
              ) : isEditing ? (
                <div className="space-y-2">
                  <DebouncedInput
                    placeholder="Contact name"
                    value={name}
                    onDebouncedChange={(v) => onChange({ [slot.nameField]: v } as any)}
                    className="h-10 text-sm rounded-xl"
                  />
                  <DebouncedInput
                    placeholder="Phone number"
                    type="tel"
                    value={phone}
                    onDebouncedChange={(v) => onChange({ [slot.phoneField]: v } as any)}
                    className="h-10 text-sm rounded-xl"
                  />
                  <DebouncedInput
                    placeholder="Email address"
                    type="email"
                    value={email}
                    onDebouncedChange={(v) => onChange({ [slot.emailField]: v } as any)}
                    className="h-10 text-sm rounded-xl"
                  />
                </div>
              ) : (
                <div className="space-y-1.5 px-1">
                  {name && <div className="text-sm font-medium text-foreground">{name}</div>}
                  {phone && (
                    <a href={`tel:${phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" />
                      {phone}
                    </a>
                  )}
                  {email && (
                    <a href={`mailto:${email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Mail className="h-3.5 w-3.5" />
                      {email}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ContactsCard;