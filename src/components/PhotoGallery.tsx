import { useCallback, useRef } from "react";
import { FileAttachment } from "@/types/project";
import { ImagePlus, X, Camera } from "lucide-react";
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
    <div className="premium-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="section-title flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          Photos
        </h2>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} className="rounded-xl h-8 text-xs">
          <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
          Add
        </Button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
      </div>
      {photos.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-muted rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 transition-colors"
        >
          <Camera className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Click to add photos</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-secondary shadow-sm">
              <img
                src={photo.dataUrl}
                alt={photo.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
              <button
                onClick={() => remove(photo.id)}
                className="absolute top-1.5 right-1.5 bg-foreground/70 text-background rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
