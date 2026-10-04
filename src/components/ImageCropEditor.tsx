import React, { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  AlertCircle,
  Check,
  Image as ImageIcon,
  RotateCw,
  X,
} from "lucide-react";
import { RangeSlider } from "./ui/ig-ui";

interface ImageCropEditorProps {
  imageUrl: string;
  onCrop: (croppedImageUrl: string) => void;
  onCancel: () => void;
  outputSize?: number;
  maxFileSizeKB?: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const OUTPUT_QUALITY = 0.95;

function estimatedKB(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.ceil((base64.length * 3) / 4 / 1024);
}

export const ImageCropEditor: React.FC<ImageCropEditorProps> = ({
  imageUrl,
  onCrop,
  onCancel,
  outputSize = 512,
  maxFileSizeKB = 500,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancelRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const image = new Image();
    image.onload = () => {
      setMediaLoading(false);
      setMediaError(null);
    };
    image.onerror = () => {
      setMediaLoading(false);
      setMediaError("This image can't be read. Please try another one.");
    };
    image.src = imageUrl;
  }, [imageUrl]);

  /** Rotate + crop the source and return a square JPEG data URL (scaled to outputSize when larger). */
  const getCroppedImg = useCallback(
    async (src: string, area: Area, rotDeg: number): Promise<string> => {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("load_failed"));
        img.src = src;
      });

      const rotRad = (rotDeg * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rotRad));
      const sin = Math.abs(Math.sin(rotRad));
      const bBoxW = Math.round(image.naturalWidth * cos + image.naturalHeight * sin);
      const bBoxH = Math.round(image.naturalHeight * cos + image.naturalWidth * sin);

      const rotated = document.createElement("canvas");
      rotated.width = bBoxW;
      rotated.height = bBoxH;
      const rotatedCtx = rotated.getContext("2d");
      if (!rotatedCtx) throw new Error("canvas_unavailable");
      rotatedCtx.translate(bBoxW / 2, bBoxH / 2);
      rotatedCtx.rotate(rotRad);
      rotatedCtx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
      rotatedCtx.drawImage(image, 0, 0);

      const data = rotatedCtx.getImageData(
        Math.round(area.x),
        Math.round(area.y),
        Math.round(area.width),
        Math.round(area.height)
      );

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = Math.round(area.width);
      cropCanvas.height = Math.round(area.height);
      const cropCtx = cropCanvas.getContext("2d");
      if (!cropCtx) throw new Error("canvas_unavailable");
      cropCtx.putImageData(data, 0, 0);

      let square =
        area.width > outputSize || area.height > outputSize
          ? (() => {
              const scaled = document.createElement("canvas");
              scaled.width = outputSize;
              scaled.height = outputSize;
              const scaledCtx = scaled.getContext("2d");
              if (!scaledCtx) throw new Error("canvas_unavailable");
              scaledCtx.drawImage(cropCanvas, 0, 0, outputSize, outputSize);
              return scaled;
            })()
          : cropCanvas;

      return square.toDataURL("image/jpeg", OUTPUT_QUALITY);
    },
    [outputSize]
  );

  /** Re-encode at lower quality until the result is under maxFileSizeKB. */
  const compressImage = useCallback(async (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(image, 0, 0);

        let quality = 0.9;
        let result = canvas.toDataURL("image/jpeg", quality);
        while (estimatedKB(result) > maxFileSizeKB && quality > 0.1) {
          quality -= 0.05;
          result = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(result);
      };
      image.onerror = () => resolve(dataUrl);
      image.src = dataUrl;
    });
  }, [maxFileSizeKB]);

  const handleSave = async () => {
    if (!cropArea || isProcessing) return;
    setIsProcessing(true);
    try {
      let dataUrl = await getCroppedImg(imageUrl, cropArea, rotation);
      if (estimatedKB(dataUrl) > maxFileSizeKB) {
        dataUrl = await compressImage(dataUrl);
      }
      onCrop(dataUrl);
    } catch {
      setMediaError("Couldn't process this image. Please try a different file.");
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="image-crop-editor fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="image-crop-editor-panel glass w-full max-w-[600px] overflow-hidden rounded-3xl text-fg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Edit photo"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-divider px-6 py-4">
          <div>
            <h3 className="text-[20px] text-white/90">
              Edit photo
            </h3>
            <p className="mt-1 text-[15px] text-white/45">
              Crop and save your profile photo.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-muted transition-colors hover:bg-hover hover:text-fg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cropper */}
        <div className="image-crop-editor-stage relative h-[360px] w-full overflow-hidden bg-black/70">
          {mediaLoading && !mediaError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-bg/85 text-white/55">
              <span className="text-[16px]">Loading…</span>
            </div>
          )}
          {mediaError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg p-8 text-center text-white/90">
              <ImageIcon size={28} className="text-muted" />
              <span className="text-[17px]">{mediaError}</span>
              <button
                type="button"
                onClick={onCancel}
                className="mt-2 cursor-pointer rounded-xl border border-white/[0.12] bg-white/[0.08] px-3.5 py-2 text-[16px] text-white/85 transition-colors hover:bg-white/[0.15]"
              >
                Close
              </button>
            </div>
          ) : (
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={(_croppedArea, areaPixels) => setCropArea(areaPixels)}
              showGrid
            />
          )}
        </div>

        {/* Controls */}
        <div className="image-crop-editor-controls space-y-5 px-6 py-5">
          <RangeSlider
            label="Zoom"
            value={zoom}
            onChange={setZoom}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/[0.14] px-3.5 py-2.5 text-[16px] text-white/80 transition-colors hover:bg-white/[0.07]"
            >
              <RotateCw size={13} />
              Rotate
            </button>
          </div>

          {mediaError && (
            <div className="flex items-center gap-2 text-[15px] text-danger">
              <AlertCircle size={13} className="shrink-0" />
              {mediaError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="cursor-pointer border-none bg-transparent px-4 py-2.5 text-[17px] text-white/60 transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isProcessing || mediaLoading || !!mediaError || !cropArea}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.1] px-5 py-2.5 text-[17px] text-white/90 transition-colors hover:bg-white/[0.16] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {!isProcessing && <Check size={15} />}
              {isProcessing ? "Saving…" : "Save photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropEditor;