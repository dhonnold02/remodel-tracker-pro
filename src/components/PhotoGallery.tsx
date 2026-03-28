import { useCallback, useRef } from "react";
import { FileAttachment } from "@/types/project";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoGalleryProps {
  photos: FileAttachment[];
  onChange: (photos: FileAttachment[]) => void;
}

const PhotoGallery = ({ photos, onChange }: PhotoGalleryProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          const attachment: FileAttachment = {
            id: crypto.randomUUID(),
            name: file.name,
            dataUrl: reader.result as string,
            createdAt: new Date().toISOString(),
          };
          onChange([...photos, attachment]);
        };
        reader.readAsDataURL(file);
      });
      if (inputRef.current) inputRef.current.value = "";
    },
    [photos, onChange]
  );

  const remove = (id: string) => onChange(photos.filter((p) => p.id !== id));

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-foreground">Photos</h2>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="h-4 w-4 mr-1.5" />
          Add
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-secondary">
              <img
                src={photo.dataUrl}
                alt={photo.name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => remove(photo.id)}
                className="absolute top-1 right-1 bg-foreground/70 text-background rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
