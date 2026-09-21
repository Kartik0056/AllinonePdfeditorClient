/**
 * PDFPreviewModal - High-Fidelity Modal Preview for Exported PDF with Edits
 * Renders the compiled PDF (with signatures, annotations, text edits) via PDF.js
 * Features: Auto Fit-to-Page, Fit-to-Width, Non-clipping scroll container, Crisp HiDPI
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download,
  Maximize2, Minimize2, FileText, Check, Loader2
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
  const [isLoadingDoc, setIsLoadingDoc] = useState(true);
  const [isRenderingPage, setIsRenderingPage] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  // Fit Entire Page into Viewport
  const fitToPage = useCallback(async () => {
    if (!pdfDoc || !containerRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const vp = page.getViewport({ scale: 1 });
      const padX = 48;
      const padY = 48;
      const availW = Math.max(120, containerRef.current.clientWidth - padX);
      const availH = Math.max(120, containerRef.current.clientHeight - padY);

      const scale = Math.min(availW / vp.width, availH / vp.height);
      const newZoom = Math.max(25, Math.min(250, Math.floor(scale * 100)));
      setZoom(newZoom);
    } catch (err) {
      console.error('fitToPage error:', err);
    }
  }, [pdfDoc, currentPage]);

  // Fit Page Width into Viewport
  const fitToWidth = useCallback(async () => {
    if (!pdfDoc || !containerRef.current) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const vp = page.getViewport({ scale: 1 });
      const padX = 64;
      const availW = Math.max(120, containerRef.current.clientWidth - padX);
      const scale = availW / vp.width;
      const newZoom = Math.max(25, Math.min(300, Math.floor(scale * 100)));
      setZoom(newZoom);
    } catch (err) {
      console.error('fitToWidth error:', err);
    }
  }, [pdfDoc, currentPage]);

  // Load PDF document from bytes - strictly isolated from zoom state
  useEffect(() => {
    if (!isOpen || !pdfBytes) {
      setPdfDoc(null);
      setIsLoadingDoc(false);
      return;
    }

    let isMounted = true;
    setIsLoadingDoc(true);

    const load = async () => {
      try {
        const doc = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        const pageToLoad = Math.min(initialPage, doc.numPages);
        setCurrentPage(pageToLoad);

        // Calculate initial optimal zoom
        if (containerRef.current) {
          try {
            const page = await doc.getPage(pageToLoad);
            const vp = page.getViewport({ scale: 1 });
            const padX = 48;
            const padY = 48;
            const availW = Math.max(120, containerRef.current.clientWidth - padX);
            const availH = Math.max(120, containerRef.current.clientHeight - padY);
            const scale = Math.min(availW / vp.width, availH / vp.height);
            const initialZoom = Math.max(25, Math.min(180, Math.floor(scale * 100)));
            setZoom(initialZoom);
          } catch {}
        }
      } catch (err) {
        console.error('Failed to load PDF in preview modal:', err);
      } finally {
        if (isMounted) {
          setIsLoadingDoc(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [isOpen, pdfBytes, initialPage]);

  // Render Page Canvas with crisp HiDPI
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
        setIsRenderingPage(true);
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d')!;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const cssScale = zoom / 100;
        const viewport = page.getViewport({ scale: cssScale * dpr });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;

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
      } finally {
        setIsRenderingPage(false);
      }
    },
    [pdfDoc, zoom]
  );

  useEffect(() => {
    if (pdfDoc && isOpen) {
      renderPreviewPage(currentPage);
    }
  }, [pdfDoc, currentPage, zoom, isOpen, renderPreviewPage]);

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentPage > 1) setCurrentPage((p) => p - 1);
      if (e.key === 'ArrowRight' && currentPage < totalPages) setCurrentPage((p) => p + 1);
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(300, z + 15));
      if (e.key === '-' || e.key === '_') setZoom((z) => Math.max(25, z - 15));
      if (e.key === '0') fitToPage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, totalPages, onClose, fitToPage]);

  const handleDownload = () => {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-fade-in select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-surface-800/80 bg-surface-950/95 px-4 sm:px-6 flex items-center justify-between shrink-0 gap-3">
        {/* Left: Document info */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {fileName}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-surface-400">
              {isRenderingPage ? (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-400" /> Rendering page...
                </span>
              ) : (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" /> Edited Preview
                </span>
              )}
              <span>·</span>
              <span className="text-surface-400">High Precision Vector</span>
            </div>
          </div>
        </div>

        {/* Center: Page Switcher */}
        <div className="flex items-center gap-1.5 bg-surface-900 px-2.5 py-1 rounded-lg border border-surface-800 shrink-0">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="btn-icon p-1 text-surface-400 hover:text-white disabled:opacity-30"
            title="Previous Page (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-white font-mono px-2 font-medium">
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
          {/* Zoom Buttons Group */}
          <div className="flex items-center gap-1 bg-surface-900 px-2 py-1 rounded-lg border border-surface-800 text-xs">
            <button
              onClick={() => setZoom((z) => Math.max(25, z - 15))}
              className="btn-icon p-1 text-surface-400 hover:text-white"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-surface-300 font-mono w-11 text-center font-medium">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(300, z + 15))}
              className="btn-icon p-1 text-surface-400 hover:text-white"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="h-3.5 w-px bg-surface-700 mx-1 hidden sm:block" />

            <button
              onClick={() => fitToPage()}
              className="px-2 py-0.5 rounded text-[11px] font-medium text-surface-300 hover:text-white hover:bg-surface-800 transition-colors hidden sm:block"
              title="Fit entire page in window (0)"
            >
              Fit Page
            </button>
            <button
              onClick={() => fitToWidth()}
              className="px-2 py-0.5 rounded text-[11px] font-medium text-surface-300 hover:text-white hover:bg-surface-800 transition-colors hidden md:block"
              title="Fit page width"
            >
              Fit Width
            </button>
            <button
              onClick={() => setZoom(100)}
              className="px-1.5 py-0.5 rounded text-[11px] font-mono text-surface-400 hover:text-white hover:bg-surface-800 transition-colors hidden lg:block"
              title="Reset to 100%"
            >
              100%
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="btn-icon p-1.5 text-surface-400 hover:text-white hover:bg-surface-800 rounded-lg hidden sm:flex"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownload}
            className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-md shadow-primary-500/20 font-medium"
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

      {/* Main Canvas Scroll Area - Uses m-auto so overflowing content is 100% reachable with no top/bottom cropping */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 sm:p-8 bg-surface-950/80 relative flex"
      >
        {isLoadingDoc && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-950/80 backdrop-blur-sm z-20 gap-3">
            <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <p className="text-xs text-surface-300">Loading document...</p>
          </div>
        )}

        <div className="m-auto relative shadow-2xl rounded-sm overflow-hidden bg-white shrink-0">
          <canvas ref={canvasRef} className="block shadow-2xl" />
        </div>
      </div>
    </div>
  );
}
