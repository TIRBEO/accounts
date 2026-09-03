import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { 
  RotateCw, RotateCcw, ZoomIn, ZoomOut, 
  Check, X, Move, RefreshCw, FlipHorizontal, FlipVertical,
  Sun, Contrast, Droplets, Info, Undo2, Redo2
} from 'lucide-react';

interface ImageCropEditorProps {
  imageUrl: string;
  onCrop: (croppedImageUrl: string) => void;
  onCancel: () => void;
  outputSize?: number;
  maxFileSizeKB?: number;
}

interface ImageInfo {
  originalSize: number;
  dimensions: string;
  type: string;
}

// Snapshot of all editable state for undo/redo
interface EditorSnapshot {
  zoom: number;
  rotation: number;
  position: { x: number; y: number };
  flipH: boolean;
  flipV: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
}

const INITIAL_SNAPSHOT: EditorSnapshot = {
  zoom: 1,
  rotation: 0,
  position: { x: 0, y: 0 },
  flipH: false,
  flipV: false,
  brightness: 100,
  contrast: 100,
  saturation: 100,
};

export const ImageCropEditor: React.FC<ImageCropEditorProps> = ({
  imageUrl,
  onCrop,
  onCancel,
  outputSize = 512,
  maxFileSizeKB = 500,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Image state
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  
  // Transform state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  
  // Filter state
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Touch state for pinch-to-zoom
  const [touchDistance, setTouchDistance] = useState(0);
  const [isPinching, setIsPinching] = useState(false);
  
  // UI state
  const [activeTab, setActiveTab] = useState<'adjust' | 'filters'>('adjust');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const previewSize = 280;
  
  // ═══ UNDO/REDO HISTORY ═══
  const [history, setHistory] = useState<EditorSnapshot[]>([INITIAL_SNAPSHOT]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Push a new snapshot to history (truncates any future states)
  const pushHistory = useCallback((snapshot: EditorSnapshot) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      // Limit history to 50 entries
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);
  
  // Undo: go back one step
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const snapshot = history[historyIndex - 1];
    setZoom(snapshot.zoom);
    setRotation(snapshot.rotation);
    setPosition(snapshot.position);
    setFlipH(snapshot.flipH);
    setFlipV(snapshot.flipV);
    setBrightness(snapshot.brightness);
    setContrast(snapshot.contrast);
    setSaturation(snapshot.saturation);
    setHistoryIndex(prev => prev - 1);
  }, [historyIndex, history]);
  
  // Redo: go forward one step
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const snapshot = history[historyIndex + 1];
    setZoom(snapshot.zoom);
    setRotation(snapshot.rotation);
    setPosition(snapshot.position);
    setFlipH(snapshot.flipH);
    setFlipV(snapshot.flipV);
    setBrightness(snapshot.brightness);
    setContrast(snapshot.contrast);
    setSaturation(snapshot.saturation);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex, history]);
  
  // Capture current state as a snapshot
  const captureSnapshot = useCallback((): EditorSnapshot => ({
    zoom, rotation, position: { ...position }, flipH, flipV, brightness, contrast, saturation,
  }), [zoom, rotation, position, flipH, flipV, brightness, contrast, saturation]);
  
  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl/Cmd + Shift + Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // Ctrl/Cmd + Y = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  
  // Load image and get info with comprehensive error handling
  useEffect(() => {
    // Reset states
    setImageError(null);
    setImageLoaded(false);
    
    // Validate URL is not empty
    if (!imageUrl || imageUrl.trim() === '') {
      setImageError('No image provided');
      return;
    }
    
    // Validate base64 data URL format
    if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(',');
      if (parts.length < 2 || parts[1].trim() === '') {
        setImageError('Invalid image data');
        return;
      }
      // Check if base64 data is too small (likely corrupted)
      if (parts[1].length < 100) {
        setImageError('Image data is too small or corrupted');
        return;
      }
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Validate image dimensions
      if (img.width === 0 || img.height === 0) {
        setImageError('Image has invalid dimensions');
        return;
      }
      
      // Warn about very small images
      if (img.width < 10 || img.height < 10) {
        console.warn('Image is very small:', img.width, 'x', img.height);
      }
      
      imageRef.current = img;
      setImageLoaded(true);
      setImageInfo({
        originalSize: Math.round(imageUrl.length * 0.75 / 1024),
        dimensions: `${img.width} × ${img.height}`,
        type: imageUrl.includes('png') ? 'PNG' : 
              imageUrl.includes('gif') ? 'GIF' : 
              imageUrl.includes('webp') ? 'WebP' : 'JPEG',
      });
    };
    
    img.onerror = () => {
      setImageError('Failed to load image. The file may be corrupted or in an unsupported format.');
      setImageLoaded(false);
    };
    
    try {
      img.src = imageUrl;
    } catch (err) {
      setImageError('Invalid image URL');
    }
  }, [imageUrl]);
  
  // Draw preview on canvas with all transforms and filters
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = imageRef.current;
    
    canvas.width = previewSize;
    canvas.height = previewSize;
    
    ctx.clearRect(0, 0, previewSize, previewSize);
    ctx.save();
    
    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    
    // Create circular clip
    ctx.beginPath();
    ctx.arc(previewSize / 2, previewSize / 2, previewSize / 2, 0, Math.PI * 2);
    ctx.clip();
    
    // Calculate dimensions
    const imgAspect = img.width / img.height;
    let drawWidth, drawHeight;
    
    if (imgAspect > 1) {
      drawHeight = previewSize * zoom;
      drawWidth = drawHeight * imgAspect;
    } else {
      drawWidth = previewSize * zoom;
      drawHeight = drawWidth / imgAspect;
    }
    
    // Apply transforms
    ctx.translate(previewSize / 2, previewSize / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.translate(-previewSize / 2, -previewSize / 2);
    
    // Draw image with position offset
    const x = (previewSize - drawWidth) / 2 + position.x;
    const y = (previewSize - drawHeight) / 2 + position.y;
    
    ctx.drawImage(img, x, y, drawWidth, drawHeight);
    ctx.restore();
    
  }, [imageLoaded, zoom, rotation, position, flipH, flipV, brightness, contrast, saturation]);
  
  // Pointer event handlers with proper capture
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    const maxOffset = Math.max(0, (zoom - 1) * previewSize * 0.5);
    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, newX));
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, newY));
    
    setPosition({ x: clampedX, y: clampedY });
  }, [isDragging, dragStart, zoom, previewSize]);
  
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Touch event handlers for pinch-to-zoom
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      e.preventDefault();
      setIsPinching(true);
      setTouchDistance(getTouchDistance(e.touches));
    } else if (e.touches.length === 1) {
      // Single touch - start drag
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching) {
      // Pinch zoom
      e.preventDefault();
      const newDistance = getTouchDistance(e.touches);
      if (touchDistance > 0) {
        const scale = newDistance / touchDistance;
        const newZoom = Math.max(0.5, Math.min(3, zoom * scale));
        setZoom(newZoom);
        setTouchDistance(newDistance);
      }
    } else if (e.touches.length === 1 && isDragging && !isPinching) {
      // Single touch drag
      e.preventDefault();
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      
      const maxOffset = Math.max(0, (zoom - 1) * previewSize * 0.5);
      const clampedX = Math.max(-maxOffset, Math.min(maxOffset, newX));
      const clampedY = Math.max(-maxOffset, Math.min(maxOffset, newY));
      
      setPosition({ x: clampedX, y: clampedY });
    }
  }, [isDragging, isPinching, dragStart, zoom, previewSize, touchDistance]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
      setTouchDistance(0);
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  }, []);
  
  // Compress image to target size
  const compressImage = async (dataUrl: string, maxKB: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        // Start with high quality and reduce until under maxKB
        let quality = 0.92;
        let result = canvas.toDataURL('image/jpeg', quality);
        
        while (result.length * 0.75 / 1024 > maxKB && quality > 0.1) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        
        resolve(result);
      };
      img.src = dataUrl;
    });
  };
  
  // Handle crop and output with compression
  const handleCrop = useCallback(async () => {
    if (!imageRef.current) return;
    
    setIsProcessing(true);
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const img = imageRef.current;
      
      // Apply filters
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      
      // Create circular clip
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.clip();
      
      // Calculate dimensions
      const imgAspect = img.width / img.height;
      let drawWidth, drawHeight;
      
      if (imgAspect > 1) {
        drawHeight = outputSize * zoom;
        drawWidth = drawHeight * imgAspect;
      } else {
        drawWidth = outputSize * zoom;
        drawHeight = drawWidth / imgAspect;
      }
      
      // Apply transforms
      ctx.translate(outputSize / 2, outputSize / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.translate(-outputSize / 2, -outputSize / 2);
      
      // Scale position
      const scaleFactor = outputSize / previewSize;
      const scaledPosition = {
        x: position.x * scaleFactor,
        y: position.y * scaleFactor,
      };
      
      const x = (outputSize - drawWidth) / 2 + scaledPosition.x;
      const y = (outputSize - drawHeight) / 2 + scaledPosition.y;
      
      ctx.drawImage(img, x, y, drawWidth, drawHeight);
      
      // Get output and compress if needed
      let result = canvas.toDataURL('image/png');
      
      // Check size and compress if over limit
      const sizeKB = result.length * 0.75 / 1024;
      if (sizeKB > maxFileSizeKB) {
        result = await compressImage(result, maxFileSizeKB);
      }
      
      onCrop(result);
    } catch (err) {
      console.error('Crop error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [zoom, rotation, position, flipH, flipV, brightness, contrast, saturation, outputSize, previewSize, maxFileSizeKB, onCrop]);
  
  // Reset all adjustments
  const handleReset = () => {
    pushHistory(captureSnapshot());
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setFlipH(false);
    setFlipV(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };
  
  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.95)] backdrop-blur-xl" onClick={onCancel} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="wave-card w-full max-w-lg p-5 relative z-10 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--wave-text)]">Edit Photo</h3>
            <p className="text-xs text-[var(--wave-on-surface-variant)]">Drag to reposition, pinch to zoom</p>
          </div>
          {imageInfo && (
            <div className="text-right">
              <p className="text-xs text-[var(--wave-on-surface-variant)]">{imageInfo.dimensions}</p>
              <p className="text-xs text-[var(--wave-on-surface-variant)]">{imageInfo.type} • ~{formatSize(imageInfo.originalSize * 1024)}</p>
            </div>
          )}
        </div>
        
        {/* Error Display */}
        {imageError && (
          <div className="mb-4 p-4 rounded-xl bg-[var(--wave-error-container)] border border-[var(--wave-error)]/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--wave-error)]/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[var(--wave-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--wave-error)]">Image Error</p>
                <p className="text-xs text-[var(--wave-on-surface-variant)] mt-0.5">{imageError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full py-2 rounded-lg bg-[var(--wave-error-container)] hover:bg-[var(--wave-error)]/20 text-[var(--wave-error)] text-xs font-medium transition-all"
            >
              Try Another Image
            </button>
          </div>
        )}
        
        {/* Crop Preview Area */}
        <div 
          ref={containerRef}
          className="relative w-full aspect-square max-w-[280px] mx-auto mb-4 rounded-full overflow-hidden border-2 border-[rgba(255,255,255,0.2)] bg-[rgba(0,0,0,0.6)] touch-none select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <canvas
            ref={canvasRef}
            width={previewSize}
            height={previewSize}
            className="w-full h-full"
          />
          
          {/* Drag indicator */}
          {!isDragging && imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-50">
              <div className="p-3 rounded-full bg-[rgba(0,0,0,0.6)] backdrop-blur-sm">
                <Move className="w-6 h-6 text-[var(--wave-text)]" />
              </div>
            </div>
          )}
          
          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.7)]">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        
        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('adjust')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'adjust'
                ? 'bg-[var(--wave-primary)] text-[var(--wave-on-primary)]'
                : 'bg-[var(--wave-surface-container-low)] text-[var(--wave-on-surface-variant)] hover:bg-[var(--wave-surface-container)]'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5 inline mr-1.5" />
            Adjust
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('filters')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'filters'
                ? 'bg-[var(--wave-primary)] text-[var(--wave-on-primary)]'
                : 'bg-[var(--wave-surface-container-low)] text-[var(--wave-on-surface-variant)] hover:bg-[var(--wave-surface-container)]'
            }`}
          >
            <Sun className="w-3.5 h-3.5 inline mr-1.5" />
            Filters
          </button>
        </div>
        
        {/* Adjust Tab */}
        {activeTab === 'adjust' && (
          <div className="space-y-4">
            {/* Zoom Control */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[var(--wave-on-surface-variant)] font-medium flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5" />
                  Zoom
                </label>
                <span className="text-xs text-[var(--wave-text)] font-mono">{Math.round(zoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => {
                  const newZoom = parseFloat(e.target.value);
                  setZoom(newZoom);
                  pushHistory(captureSnapshot());
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--wave-surface-container)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--wave-primary)] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.2)]"
              />
            </div>
            
            {/* Rotation Control */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[var(--wave-on-surface-variant)] font-medium flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5" />
                  Rotation
                </label>
                <span className="text-xs text-[var(--wave-text)] font-mono">{rotation}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation}
                onChange={(e) => {
                  const newRotation = parseInt(e.target.value);
                  setRotation(newRotation);
                  pushHistory(captureSnapshot());
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--wave-surface-container)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--wave-primary)] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.2)]"
              />
            </div>
            
            {/* Quick Controls */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const newRot = rotation - 90;
                  setRotation(newRot);
                  pushHistory(captureSnapshot());
                }}
                className="p-2.5 rounded-lg bg-[var(--wave-surface-container-low)] hover:bg-[var(--wave-surface-container)] text-[var(--wave-text)]/70 hover:text-[var(--wave-text)] transition-all"
                title="Rotate left 90°"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const newRot = rotation + 90;
                  setRotation(newRot);
                  pushHistory(captureSnapshot());
                }}
                className="p-2.5 rounded-lg bg-[var(--wave-surface-container-low)] hover:bg-[var(--wave-surface-container)] text-[var(--wave-text)]/70 hover:text-[var(--wave-text)] transition-all"
                title="Rotate right 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-[var(--wave-surface-container)]" />
              <button
                type="button"
                onClick={() => {
                  const newFlipH = !flipH;
                  setFlipH(newFlipH);
                  pushHistory(captureSnapshot());
                }}
                className={`p-2.5 rounded-lg transition-all ${
                  flipH 
                    ? 'bg-[var(--wave-primary)] text-[var(--wave-on-primary)]' 
                    : 'bg-[var(--wave-surface-container-low)] hover:bg-[var(--wave-surface-container)] text-[var(--wave-text)]/70 hover:text-[var(--wave-text)]'
                }`}
                title="Flip horizontal"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const newFlipV = !flipV;
                  setFlipV(newFlipV);
                  pushHistory(captureSnapshot());
                }}
                className={`p-2.5 rounded-lg transition-all ${
                  flipV 
                    ? 'bg-[var(--wave-primary)] text-[var(--wave-on-primary)]' 
                    : 'bg-[var(--wave-surface-container-low)] hover:bg-[var(--wave-surface-container)] text-[var(--wave-text)]/70 hover:text-[var(--wave-text)]'
                }`}
                title="Flip vertical"
              >
                <FlipVertical className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-[var(--wave-surface-container)]" />
              <button
                type="button"
                onClick={handleReset}
                className="p-2.5 rounded-lg bg-[var(--wave-surface-container-low)] hover:bg-[var(--wave-surface-container)] text-[var(--wave-text)]/70 hover:text-[var(--wave-text)] transition-all"
                title="Reset all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-[var(--wave-surface-container)]" />
              {/* Undo Button */}
              <button
                type="button"
                onClick={undo}
                disabled={!canUndo}
                className={`p-2.5 rounded-lg transition-all ${
                  canUndo
                    ? 'bg-[var(--wave-surface-container-low)] hover:bg-[var(--wave-surface-container)] text-[var(--wave-text)]/70 hover:text-[var(--wave-text)]'
                    : 'bg-[var(--wave-surface-container-low)] text-[var(--wave-on-surface-variant)] cursor-not-allowed'
                }`}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              {/* Redo Button */}
              <button
                type="button"
                onClick={redo}
                disabled={!canRedo}
                className={`p-2.5 rounded-lg transition-all ${
                  canRedo
                    ? 'bg-[var(--wave-surface-container-low)] hover:bg-[var(--wave-surface-container)] text-[var(--wave-text)]/70 hover:text-[var(--wave-text)]'
                    : 'bg-[var(--wave-surface-container-low)] text-[var(--wave-on-surface-variant)] cursor-not-allowed'
                }`}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* Filters Tab */}
        {activeTab === 'filters' && (
          <div className="space-y-4">
            {/* Brightness */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[var(--wave-on-surface-variant)] font-medium flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" />
                  Brightness
                </label>
                <span className="text-xs text-[var(--wave-text)] font-mono">{brightness}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="1"
                value={brightness}
                onChange={(e) => {
                  const newBrightness = parseInt(e.target.value);
                  setBrightness(newBrightness);
                  pushHistory(captureSnapshot());
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--wave-surface-container)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--wave-primary)] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.2)]"
              />
            </div>
            
            {/* Contrast */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[var(--wave-on-surface-variant)] font-medium flex items-center gap-1.5">
                  <Contrast className="w-3.5 h-3.5" />
                  Contrast
                </label>
                <span className="text-xs text-[var(--wave-text)] font-mono">{contrast}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="1"
                value={contrast}
                onChange={(e) => {
                  const newContrast = parseInt(e.target.value);
                  setContrast(newContrast);
                  pushHistory(captureSnapshot());
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--wave-surface-container)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--wave-primary)] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.2)]"
              />
            </div>
            
            {/* Saturation */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[var(--wave-on-surface-variant)] font-medium flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" />
                  Saturation
                </label>
                <span className="text-xs text-[var(--wave-text)] font-mono">{saturation}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="1"
                value={saturation}
                onChange={(e) => {
                  const newSaturation = parseInt(e.target.value);
                  setSaturation(newSaturation);
                  pushHistory(captureSnapshot());
                }}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--wave-surface-container)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--wave-primary)] [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.2)]"
              />
            </div>
            
            {/* Reset Filters */}              <button
              type="button"
              onClick={() => {
                pushHistory(captureSnapshot());
                setBrightness(100);
                setContrast(100);
                setSaturation(100);
              }}
              className="w-full py-2 rounded-lg bg-[var(--wave-surface-container-low)] hover:bg-[var(--wave-surface-container)] text-[var(--wave-on-surface-variant)] hover:text-[var(--wave-text)] text-xs font-medium transition-all"
            >
              Reset Filters
            </button>
          </div>
        )}
        
        {/* Output Size Info */}
        <div className="flex items-center gap-2 mt-4 p-2.5 rounded-lg bg-[var(--wave-surface-container-low)] border border-[var(--wave-outline-variant)]">
          <Info className="w-3.5 h-3.5 text-[var(--wave-on-surface-variant)]" />
          <p className="text-xs text-[var(--wave-on-surface-variant)]">
            Output: {outputSize}×{outputSize}px • Max {maxFileSizeKB}KB (auto-compressed)
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="wave-btn wave-btn-secondary flex-1"
            disabled={isProcessing}
          >
            <X className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Cancel</span>
          </button>
          <button
            type="button"
            onClick={handleCrop}
            disabled={isProcessing}
            className="wave-btn wave-btn-primary flex-1"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin relative z-10" />
            ) : (
              <Check className="w-4 h-4 relative z-10" />
            )}
            <span className="relative z-10">{isProcessing ? 'Processing...' : 'Use Photo'}</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
