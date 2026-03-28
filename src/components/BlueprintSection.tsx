import { useCallback, useRef } from "react";
import { FileAttachment } from "@/types/project";
import { FileUp, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlueprintSectionProps {
  blueprints: FileAttachment[];
  onChange: (blueprints: FileAttachment[]) => void;
}

const BlueprintSection = ({ blueprints, onChange }: BlueprintSectionProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const attachment: FileAttachment = {
            id: crypto.randomUUID(),
            name: file.name,
            dataUrl: reader.result as string,
            createdAt: new Date().toISOString(),
          };
          onChange([...blueprints, attachment]);
        };
        reader.readAsDataURL(file);
      });
      if (inputRef.current) inputRef.current.value = "";
    },
    [blueprints, onChange]
  );

  const remove = (id: string) => onChange(blueprints.filter((b) => b.id !== id));

  const isImage = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Blueprints & Plans</h2>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          <FileUp className="h-4 w-4 mr-1.5" />
          Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {blueprints.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No blueprints uploaded.</p>
      ) : (
        <div className="space-y-2">
          {blueprints.map((bp) => (
            <div key={bp.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
              {isImage(bp.name) ? (
                <img src={bp.dataUrl} alt={bp.name} className="h-12 w-12 rounded object-cover shrink-0" />
              ) : (
                <div className="h-12 w-12 rounded bg-secondary flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm text-foreground truncate flex-1">{bp.name}</span>
              <button onClick={() => remove(bp.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlueprintSection;
