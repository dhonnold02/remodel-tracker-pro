import { uuidv4 } from "@/lib/uuid";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { showSuccess, showError } from "@/lib/toast";

interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  addedAt: number;
}

interface Props {
  projectId: string;
  isEditor: boolean;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10MB per file

const readFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const formatSize = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const LocalFileUploads = ({ projectId, isEditor }: Props) => {
  const storageKey = `project-files:${projectId}`;
  const [files, setFiles] = useState<StoredFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setFiles(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  const persist = (next: StoredFile[]) => {
    setFiles(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      showError("Storage full — remove some files");
    }
  };

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const added: StoredFile[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_BYTES) {
        showError(`${f.name} is too large (max 10MB)`);
        continue;
      }
      try {
        const dataUrl = await readFile(f);
        added.push({
          id: uuidv4(),
          name: f.name,
          type: f.type || "application/octet-stream",
          size: f.size,
          dataUrl,
          addedAt: Date.now(),
        });
      } catch {
        showError(`Failed to read ${f.name}`);
      }
    }
    if (added.length) {
      persist([...added, ...files]);
      showSuccess(`Added ${added.length} file${added.length > 1 ? "s" : ""}`);
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (id: string) => persist(files.filter((f) => f.id !== id));

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
      {isEditor && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Upload files
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Stored locally on this device · Max 10MB per file
          </p>
        </>
      )}

      {files.length === 0 ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
          No files uploaded yet
        </div>
      ) : (
        <ul className="space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-2 rounded-xl bg-background/60 ring-1 ring-border/60 p-2.5"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-foreground truncate">
                  {f.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatSize(f.size)}
                </div>
              </div>
              <a
                href={f.dataUrl}
                download={f.name}
                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                title="Download"
                aria-label={`Download ${f.name}`}
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              {isEditor && (
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  title="Remove"
                  aria-label={`Remove ${f.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocalFileUploads;