import { uuidv4 } from "@/lib/uuid";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileAttachment } from "@/types/project";
import { ImagePlus, X, Camera, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoGalleryProps {
  photos: FileAttachment[];
  onChange: (photos: FileAttachment[]) => void;
}

const PhotoGallery = ({ photos, onChange }: PhotoGalleryProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const touchState = useRef<{ startX: number; startY: number; time: number } | null>(null);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
          const attachment: FileAttachment = {
            id: uuidv4(),
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

  const closeLightbox = useCallback(() => {
    setActiveIndex(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [photos.length]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i === null ? null : (i + 1) % photos.length));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [photos.length]);

  // Keyboard handlers + body scroll lock
  useEffect(() => {
    if (activeIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 4));
      else if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 1));
    };
    window.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [activeIndex, closeLightbox, goPrev, goNext]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(1, Math.min(4, z - e.deltaY * 0.002)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragState.current) return;
    const { startX, startY, baseX, baseY } = dragState.current;
    setOffset({ x: baseX + (e.clientX - startX), y: baseY + (e.clientY - startY) });
  };
  const handleMouseUp = () => {
    dragState.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchState.current = { startX: t.clientX, startY: t.clientY, time: Date.now() };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchState.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.startX;
    const dy = t.clientY - start.startY;
    touchState.current = null;
    if (zoom > 1) return;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) goPrev();
      else goNext();
    }
  };

  const activePhoto = activeIndex !== null ? photos[activeIndex] : null;

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
          <p className="text-sm text-muted-foreground">Drop photos here or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">JPG, PNG, HEIC up to 10MB</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              onClick={() => setActiveIndex(idx)}
              className="relative group aspect-square rounded-xl overflow-hidden bg-secondary shadow-sm cursor-zoom-in"
            >
              <img
                src={photo.dataUrl}
                alt={photo.name}
                className="w-full h-full object-cover transition-all duration-200 group-hover:scale-105 group-hover:brightness-110"
              />
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  remove(photo.id);
                }}
                aria-label="Remove photo"
                className="absolute top-1.5 right-1.5 bg-foreground/70 text-background rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium opacity-80">
              {activeIndex !== null && `${activeIndex + 1} / ${photos.length}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 1))}
                className="rounded-full bg-white/10 hover:bg-white/20 p-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 4))}
                className="rounded-full bg-white/10 hover:bg-white/20 p-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={closeLightbox}
                className="rounded-full bg-white/10 hover:bg-white/20 p-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition-colors z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                aria-label="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-3 text-white transition-colors z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                aria-label="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative max-w-[92vw] max-h-[85vh] overflow-hidden flex items-center justify-center select-none"
            onClick={(e) => e.stopPropagation()}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: zoom > 1 ? (dragState.current ? "grabbing" : "grab") : "auto" }}
          >
            <img
              src={activePhoto.dataUrl}
              alt={activePhoto.name}
              draggable={false}
              className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-150"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
