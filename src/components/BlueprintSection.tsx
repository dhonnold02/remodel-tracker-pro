import { uuidv4 } from "@/lib/uuid";
import { useCallback, useRef } from "react";
import { FileAttachment } from "@/types/project";
import { FileUp, X, FileText, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";

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
            id: uuidv4(),
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
    <div className="bg-white border border-[hsl(214_13%_90%)] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          Blueprints & Plans
        </h2>
        <Button size="sm" onClick={() => inputRef.current?.click()} className="rounded-lg h-9 text-xs">
          <FileUp className="h-3.5 w-3.5 mr-1.5" />
          Upload
        </Button>
        <input ref={inputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleUpload} />
      </div>
      {blueprints.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No blueprints yet" description="Upload site plans, drawings, or PDFs." />
      ) : (
        <div className="space-y-2">
          {blueprints.map((bp) => (
            <div key={bp.id} className="flex items-center gap-3 rounded-lg border border-[hsl(214_13%_90%)] bg-white p-3 hover:bg-accent/40 transition-colors">
              {isImage(bp.name) ? (
                <img src={bp.dataUrl} alt={bp.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <span className="text-sm text-foreground truncate flex-1">{bp.name}</span>
              <button onClick={() => remove(bp.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg">
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
