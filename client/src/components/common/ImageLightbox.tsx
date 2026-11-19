import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Sparkles } from 'lucide-react';

export interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  productName: string;
  craftsmanshipDetail?: string;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  onClose,
  images,
  currentIndex,
  onIndexChange,
  productName,
  craftsmanshipDetail,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom and pan whenever current image changes or modal opens
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentIndex, isOpen]);

  // Lock body scroll while lightbox is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    const nextIdx = (currentIndex - 1 + images.length) % images.length;
    onIndexChange(nextIdx);
  }, [currentIndex, images.length, onIndexChange]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    const nextIdx = (currentIndex + 1) % images.length;
    onIndexChange(nextIdx);
  }, [currentIndex, images.length, onIndexChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(z + 0.5, 3));
      } else if (e.key === '-') {
        setZoom((z) => {
          const nextZ = Math.max(z - 0.5, 1);
          if (nextZ === 1) setPan({ x: 0, y: 0 });
          return nextZ;
        });
      } else if (e.key === '0') {
        setZoom(1);
        setPan({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  // Zoom controls
  const zoomIn = () => setZoom((z) => Math.min(z + 0.5, 3));
  const zoomOut = () =>
    setZoom((z) => {
      const nextZ = Math.max(z - 0.5, 1);
      if (nextZ === 1) setPan({ x: 0, y: 0 });
      return nextZ;
    });
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Double click / double tap toggles 2.2x zoom
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      resetZoom();
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left - rect.width / 2;
      const offsetY = e.clientY - rect.top - rect.height / 2;
      setZoom(2.2);
      setPan({ x: -offsetX * 1.2, y: -offsetY * 1.2 });
    }
  };

  // Mouse pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers: swiping when zoom = 1, panning when zoom > 1
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      if (zoom > 1) {
        setIsDragging(true);
        setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && zoom > 1) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoom <= 1 && touchStartRef.current && e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Detect horizontal swipe if deltaX is significant and primarily horizontal
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    }
    setIsDragging(false);
    touchStartRef.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Fullscreen craftsmanship view: ${productName}`}
      className="fixed inset-0 z-50 bg-charcoal-950/98 backdrop-blur-md flex flex-col justify-between text-ivory-100 select-none animate-fade-in"
      onMouseUp={handleMouseUp}
    >
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-charcoal-800/80 z-20 bg-charcoal-950/80">
        {/* Left: Product & Craftsmanship */}
        <div className="flex flex-col">
          <h2 className="font-serif text-base sm:text-lg font-medium text-ivory-50 tracking-wide truncate max-w-xs sm:max-w-md">
            {productName}
          </h2>
          {craftsmanshipDetail && (
            <div className="flex items-center gap-1.5 text-[11px] text-sand-400 font-medium tracking-wider uppercase mt-0.5">
              <Sparkles className="w-3 h-3 text-sand-400" />
              <span>{craftsmanshipDetail}</span>
            </div>
          )}
        </div>

        {/* Center: Image Counter */}
        <div className="text-xs uppercase tracking-widest text-charcoal-300 font-mono hidden sm:block">
          Perspective {currentIndex + 1} of {images.length}
        </div>

        {/* Right: Zoom & Close Controls */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-charcoal-900 border border-charcoal-800 rounded-full px-2 py-1">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= 1}
              className="p-1 text-charcoal-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-sand-300 px-1 w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= 3}
              className="p-1 text-charcoal-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoom > 1 && (
              <button
                type="button"
                onClick={resetZoom}
                className="p-1 text-sand-400 hover:text-sand-300 ml-1 transition-colors"
                title="Reset Zoom (0)"
                aria-label="Reset zoom"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Close Lightbox */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-charcoal-900 hover:bg-charcoal-800 border border-charcoal-800 text-ivory-200 hover:text-white flex items-center justify-center transition-colors ml-2"
            aria-label="Close image viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Stage Image Area */}
      <div
        ref={containerRef}
        className={`relative flex-1 flex items-center justify-center overflow-hidden p-4 sm:p-8 ${
          zoom > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Previous Image Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            className="absolute left-3 sm:left-6 z-30 w-11 h-11 rounded-full bg-charcoal-950/80 hover:bg-charcoal-900 border border-charcoal-800 text-ivory-100 flex items-center justify-center transition-transform hover:scale-110 shadow-lg"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Image Button */}
        {images.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
            className="absolute right-3 sm:right-6 z-30 w-11 h-11 rounded-full bg-charcoal-950/80 hover:bg-charcoal-900 border border-charcoal-800 text-ivory-100 flex items-center justify-center transition-transform hover:scale-110 shadow-lg"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Displayed Image */}
        <div
          className="relative max-w-full max-h-full transition-transform ease-out select-none"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transitionDuration: isDragging ? '0ms' : '200ms',
          }}
        >
          <img
            src={currentImage}
            alt={`${productName} view ${currentIndex + 1}`}
            className="max-h-[72vh] sm:max-h-[78vh] w-auto object-contain rounded-xs shadow-2xl pointer-events-none"
            draggable={false}
          />
        </div>

        {/* Mobile Perspective & Zoom Pill Overlay */}
        <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none sm:hidden">
          <div className="bg-charcoal-950/80 backdrop-blur-xs border border-charcoal-800 px-3 py-1 rounded-full text-[10px] text-ivory-300 font-mono tracking-wider">
            {currentIndex + 1} / {images.length} • Double-tap to zoom
          </div>
        </div>
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div className="px-4 py-3 bg-charcoal-950/90 border-t border-charcoal-800/80 flex items-center justify-center gap-2.5 z-20 overflow-x-auto">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onIndexChange(idx)}
              className={`w-14 h-16 sm:w-16 sm:h-20 rounded-xs overflow-hidden border-2 transition-all shrink-0 ${
                currentIndex === idx
                  ? 'border-sand-400 scale-105 shadow-md'
                  : 'border-charcoal-800 opacity-60 hover:opacity-100'
              }`}
              aria-label={`Switch to view ${idx + 1}`}
            >
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
