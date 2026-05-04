import { uuidv4 } from "@/lib/uuid";
import { useCallback, useRef } from "react";
import { FileAttachment } from "@/types/project";
import { FileUp, X, FileText, FolderOpen } from "lucide-react";
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
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" />
          Blueprints & Plans
        </h2>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} className="rounded-xl h-8 text-xs">
          <FileUp className="h-3.5 w-3.5 mr-1.5" />
          Upload
        </Button>
        <input ref={inputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleUpload} />
      </div>
      {blueprints.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-muted rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 transition-colors"
        >
          <FileUp className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Click to upload blueprints</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blueprints.map((bp) => (
            <div key={bp.id} className="flex items-center gap-3 rounded-xl border bg-background p-3 hover:shadow-sm transition-shadow duration-150">
              {isImage(bp.name) ? (
                <img src={bp.dataUrl} alt={bp.name} className="h-12 w-12 rounded-lg object-cover shrink-0 shadow-sm" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
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
