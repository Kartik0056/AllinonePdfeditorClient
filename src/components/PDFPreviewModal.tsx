/**
 * PDFPreviewModal - High-Fidelity Modal Preview for Exported PDF with Edits
 * Renders the compiled PDF (with signatures, annotations, text edits) via PDF.js
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download,
  Maximize2, Minimize2, FileText, Check
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfBytes: Uint8Array | null;
  fileName?: string;
  initialPage?: number;
}

export default function PDFPreviewModal({
  isOpen,
  onClose,
  pdfBytes,
  fileName = 'document_preview.pdf',
  initialPage = 1,
}: PDFPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF document from bytes
  useEffect(() => {
    if (!isOpen || !pdfBytes) return;

    let isMounted = true;
    setIsLoading(true);

    pdfjsLib
      .getDocument({ data: pdfBytes.slice() })
      .promise.then((doc) => {
        if (!isMounted) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setCurrentPage(Math.min(initialPage, doc.numPages));
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load PDF in preview modal:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, pdfBytes, initialPage]);

  // Render Page Canvas
  const renderPreviewPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current) return;

      if (renderTaskRef.current) {
        try {
          await renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d')!;
        const scale = (zoom / 100) * 1.5;
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / 1.5}px`;
        canvas.style.height = `${viewport.height / 1.5}px`;

        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
        });
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Preview render error:', err);
        }
      }
    },
    [pdfDoc, zoom]
  );

  useEffect(() => {
    if (pdfDoc && isOpen) {
      renderPreviewPage(currentPage);
    }
  }, [pdfDoc, currentPage, zoom, isOpen, renderPreviewPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentPage > 1) setCurrentPage((p) => p - 1);
      if (e.key === 'ArrowRight' && currentPage < totalPages) setCurrentPage((p) => p + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, totalPages, onClose]);

  const handleDownload = () => {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-md animate-fade-in select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-surface-800/80 bg-surface-950/90 px-4 sm:px-6 flex items-center justify-between shrink-0 gap-3">
        {/* Left: Document info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
              {fileName}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-surface-400">
              <span className="text-emerald-400 font-medium">● Edited Preview</span>
              <span>·</span>
              <span>100% Vector Quality</span>
            </div>
          </div>
        </div>

        {/* Center: Page Switcher */}
        <div className="flex items-center gap-1.5 bg-surface-900 px-2 py-1 rounded-lg border border-surface-800 shrink-0">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="btn-icon p-1 text-surface-400 hover:text-white disabled:opacity-30"
            title="Previous Page (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-white font-mono px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="btn-icon p-1 text-surface-400 hover:text-white disabled:opacity-30"
            title="Next Page (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom & Export Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden xs:flex items-center gap-1 bg-surface-900 px-2 py-1 rounded-lg border border-surface-800">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 25))}
              className="btn-icon p-1 text-surface-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-surface-300 font-mono w-10 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(250, z + 25))}
              className="btn-icon p-1 text-surface-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 shadow-md shadow-primary-500/20"
            title="Download compiled PDF file"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>Download</span>
          </button>

          <button
            onClick={onClose}
            className="btn-icon p-1.5 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg ml-1"
            title="Close Preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 bg-surface-950/60 relative">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-950/80 backdrop-blur-sm z-20 gap-3">
            <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-xs text-surface-300">Rendering high-res preview...</p>
          </div>
        )}

        <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white">
          <canvas ref={canvasRef} className="block shadow-2xl" />
        </div>
      </div>
    </div>
  );
}
