/**
 * PagePreviewModal - Full-size popup preview modal for inspected PDF pages
 */

import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface PagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  pageImageUrl?: string;
}

export default function PagePreviewModal({
  isOpen,
  onClose,
  title = 'Page Preview',
  currentPage,
  totalPages,
  onPageChange,
  pageImageUrl,
}: PagePreviewModalProps) {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentPage > 1 && onPageChange) {
        onPageChange(currentPage - 1);
      }
      if (e.key === 'ArrowRight' && currentPage < totalPages && onPageChange) {
        onPageChange(currentPage + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, totalPages, onClose, onPageChange]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md animate-fade-in select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-surface-800/80 bg-surface-950/80 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white truncate max-w-md">{title}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-800 text-surface-300 font-mono">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        {/* Center Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange && onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || !onPageChange}
            className="btn-icon p-1.5 disabled:opacity-30 text-surface-300 hover:text-white"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-surface-400 font-mono px-2">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => onPageChange && onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || !onPageChange}
            className="btn-icon p-1.5 disabled:opacity-30 text-surface-300 hover:text-white"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(50, z - 25))}
            className="btn-icon p-1.5 text-surface-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-surface-400 font-mono w-10 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(250, z + 25))}
            className="btn-icon p-1.5 text-surface-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(100)}
            className="btn-icon p-1.5 text-surface-400 hover:text-white"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-surface-800 mx-1" />
          <button
            onClick={onClose}
            className="btn-icon p-1.5 text-surface-400 hover:text-red-400 hover:bg-red-500/10"
            title="Close Preview (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-8 cursor-zoom-out"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="relative transition-transform duration-150 shadow-2xl rounded-lg bg-white overflow-hidden"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
          onClick={(e) => e.stopPropagation()}
        >
          {pageImageUrl ? (
            <img
              src={pageImageUrl}
              alt={`Page ${currentPage}`}
              className="max-h-[82vh] w-auto max-w-[85vw] object-contain block select-none pointer-events-none"
            />
          ) : (
            <div className="w-96 h-96 flex items-center justify-center bg-surface-900 text-surface-400 text-xs">
              Loading preview...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
