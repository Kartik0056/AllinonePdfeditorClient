/**
 * Split Page - Studio 2-Column Layout (Matching iLovePDF style)
 * Left visual page canvas + Right tool options sidebar with prominent CTA
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Scissors, Upload, FileText, Download, Loader2, Plus, X,
  Check, ArrowRight, Eye, RotateCw, Trash2, CheckCircle2, Split,
  SlidersHorizontal, CheckSquare, Square
} from 'lucide-react';
import Navbar from '../components/Navbar';
import PagePreviewModal from '../components/PagePreviewModal';
import { pdfAPI } from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type SplitTabMode = 'range' | 'pages' | 'scissors';
type ExtractSubMode = 'all' | 'select';

interface PageItem {
  pageNumber: number;
  thumbUrl: string;
  previewUrl?: string;
  selected: boolean;
  rotation: number;
}

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [tabMode, setTabMode] = useState<SplitTabMode>('pages');
  const [extractSubMode, setExtractSubMode] = useState<ExtractSubMode>('select');

  // Input states
  const [extractPagesInput, setExtractPagesInput] = useState<string>('1-2');
  const [mergeExtracted, setMergeExtracted] = useState<boolean>(false);
  const [ranges, setRanges] = useState<string[]>(['1-5']);

  // Scissors cut positions
  const [cutAfterPages, setCutAfterPages] = useState<Set<number>>(new Set());

  // Pages & thumbnails state
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isLoadingPages, setIsLoadingPages] = useState<boolean>(false);

  // Processing & result
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewPageNum, setPreviewPageNum] = useState<number>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PDF pages and generate thumbnails
  const loadPdf = useCallback(async (selectedFile: File) => {
    setIsLoadingPages(true);
    setPages([]);
    setError(null);
    setResult(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
      const numPages = pdfDoc.numPages;
      const loaded: PageItem[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;

        loaded.push({
          pageNumber: i,
          thumbUrl: canvas.toDataURL('image/jpeg', 0.85),
          selected: i <= 2 || i === 1,
          rotation: 0,
        });
      }

      setPages(loaded);

      // Default input string
      if (numPages >= 2) {
        setExtractPagesInput('1-2');
      } else {
        setExtractPagesInput('1');
      }

      // Default scissor cut in middle if multi-page
      if (numPages > 1) {
        setCutAfterPages(new Set([Math.floor(numPages / 2)]));
      }
    } catch (err: any) {
      console.error('Error loading PDF pages:', err);
      setError('Could not render page previews: ' + (err.message || 'Error'));
    }

    setIsLoadingPages(false);
  }, []);

  const handleFileSelect = (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    const f = filesList[0];
    if (f.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }
    setFile(f);
    loadPdf(f);
  };

  // Click on a page to toggle its selection
  const handleTogglePageSelect = (pageNumber: number) => {
    setPages((prev) => {
      const updated = prev.map((p) =>
        p.pageNumber === pageNumber ? { ...p, selected: !p.selected } : p
      );

      // Sync input field with selected pages
      const selectedNums = updated.filter((p) => p.selected).map((p) => p.pageNumber);
      if (selectedNums.length === 0) {
        setExtractPagesInput('');
      } else {
        setExtractPagesInput(selectedNums.join(', '));
      }

      return updated;
    });
  };

  // Sync selection when user types into "Pages to extract" input
  const handleExtractInputChange = (val: string) => {
    setExtractPagesInput(val);

    // Parse entered numbers or ranges
    const parts = val.split(',').map((s) => s.trim());
    const selectedSet = new Set<number>();

    parts.forEach((part) => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
            selectedSet.add(i);
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num)) selectedSet.add(num);
      }
    });

    setPages((prev) =>
      prev.map((p) => ({ ...p, selected: selectedSet.has(p.pageNumber) }))
    );
  };

  // Toggle Scissor Cut
  const toggleScissorCut = (pageNumber: number) => {
    setCutAfterPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNumber)) {
        next.delete(pageNumber);
      } else {
        next.add(pageNumber);
      }
      return next;
    });
  };

  const handleSplitAllScissors = () => {
    const s = new Set<number>();
    for (let i = 1; i < pages.length; i++) s.add(i);
    setCutAfterPages(s);
  };

  const handleJoinAllScissors = () => {
    setCutAfterPages(new Set());
  };

  // Open Fullscreen Popup Preview
  const handleOpenPreview = async (pageNum: number) => {
    setPreviewPageNum(pageNum);
    setPreviewOpen(true);

    const target = pages.find((p) => p.pageNumber === pageNum);
    if (target && !target.previewUrl && file) {
      try {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const highRes = canvas.toDataURL('image/jpeg', 0.9);

        setPages((prev) =>
          prev.map((p) => (p.pageNumber === pageNum ? { ...p, previewUrl: highRes } : p))
        );
      } catch (e) {
        console.error('High res preview error:', e);
      }
    }
  };

  // Execute Split API Call
  const handleSplit = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      let apiMode: 'every-page' | 'by-range' | 'extract' = 'extract';
      const options: any = {};

      if (tabMode === 'pages') {
        if (extractSubMode === 'all') {
          apiMode = 'every-page';
        } else {
          apiMode = 'extract';
          options.pages = pages
            .filter((p) => p.selected)
            .map((p) => p.pageNumber);
          if (options.pages.length === 0) {
            throw new Error('Please select at least one page to extract');
          }
        }
      } else if (tabMode === 'range') {
        apiMode = 'by-range';
        options.ranges = ranges.filter((r) => r.trim());
        if (options.ranges.length === 0) throw new Error('Please enter at least one valid range');
      } else if (tabMode === 'scissors') {
        apiMode = 'by-range';
        const parts: string[] = [];
        let start = 1;
        for (let i = 1; i <= pages.length; i++) {
          if (cutAfterPages.has(i) || i === pages.length) {
            parts.push(`${start}-${i}`);
            start = i + 1;
          }
        }
        options.ranges = parts;
      }

      const response = await pdfAPI.split(file, apiMode, options);
      setResult(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Split operation failed');
    }

    setIsProcessing(false);
  };

  const currentPreviewItem = pages.find((p) => p.pageNumber === previewPageNum);

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden select-none">
      <Navbar />

      {!file ? (
        /* Empty / Upload View */
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="card p-10 max-w-lg w-full text-center border-surface-800 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Scissors className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Split PDF file</h1>
            <p className="text-surface-400 text-sm mb-6">
              Separate one page or a whole set for easy conversion into independent PDF files.
            </p>
            <div
              className="dropzone cursor-pointer py-12"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFileSelect(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <Upload className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-white font-semibold text-base mb-1">Select PDF file</p>
              <p className="text-surface-500 text-xs">or drop PDF here</p>
            </div>
          </div>
        </div>
      ) : (
        /* ─── 2-Column iLovePDF Studio Layout ──────────────────── */
        <div className="flex flex-1 overflow-hidden">
          {/* ─── LEFT: Main Visual Page Canvas (Flex-1) ─────────── */}
          <main className="flex-1 bg-surface-950 overflow-y-auto p-8 relative">
            <div className="max-w-4xl mx-auto">
              {/* Document bar */}
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-surface-800/60">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-semibold text-white truncate max-w-sm">
                    {file.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-surface-800 text-surface-400 font-mono">
                    {pages.length} pages
                  </span>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setPages([]);
                    setResult(null);
                  }}
                  className="btn-ghost text-xs text-surface-400 hover:text-white"
                >
                  Choose another file
                </button>
              </div>

              {isLoadingPages ? (
                <div className="py-24 text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3 text-red-500" />
                  <p className="text-surface-400 text-sm">Rendering PDF page sheets...</p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-8 py-4">
                  {pages.map((p, idx) => {
                    const isLast = idx === pages.length - 1;
                    const hasScissor = cutAfterPages.has(p.pageNumber);

                    return (
                      <React.Fragment key={p.pageNumber}>
                        {/* Page Sheet Container */}
                        <div
                          className="flex flex-col items-center group relative cursor-pointer"
                          onClick={() => {
                            if (tabMode === 'pages') handleTogglePageSelect(p.pageNumber);
                          }}
                        >
                          {/* Physical Paper Sheet Representation (Matching iLovePDF) */}
                          <div
                            className={`relative w-44 aspect-[3/4.2] bg-white rounded-md shadow-xl transition-all duration-200 border overflow-hidden flex flex-col justify-between ${
                              p.selected && tabMode === 'pages'
                                ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-emerald-500/10'
                                : 'border-surface-700/60 hover:shadow-2xl hover:border-surface-500'
                            }`}
                          >
                            {/* Green Circular Check Badge (iLovePDF Style) */}
                            {tabMode === 'pages' && (
                              <div
                                className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                  p.selected
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'bg-black/40 text-transparent hover:bg-black/60 border border-white/60'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}

                            {/* Hover Quick Actions */}
                            <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenPreview(p.pageNumber);
                                }}
                                className="w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center shadow"
                                title="Zoom Preview"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Page Content Image */}
                            <div className="w-full flex-1 p-2 flex items-center justify-center overflow-hidden bg-white">
                              <img
                                src={p.thumbUrl}
                                alt={`Page ${p.pageNumber}`}
                                className="w-full h-full object-contain pointer-events-none"
                              />
                            </div>

                            {/* Sheet Bottom Page Number */}
                            <div className="h-6 bg-white/95 text-center text-xs font-serif text-gray-700 flex items-center justify-center border-t border-gray-100 font-semibold select-none">
                              {p.pageNumber}
                            </div>
                          </div>
                        </div>

                        {/* Scissor Cut Separator (In Scissor Mode) */}
                        {tabMode === 'scissors' && !isLast && (
                          <div className="flex flex-col items-center justify-center -mx-3">
                            <button
                              onClick={() => toggleScissorCut(p.pageNumber)}
                              className={`p-2.5 rounded-full border transition-transform hover:scale-110 shadow-lg ${
                                hasScissor
                                  ? 'bg-red-500/20 border-red-500 text-red-400 shadow-red-500/20'
                                  : 'bg-surface-800 border-surface-700 text-surface-500 hover:text-white'
                              }`}
                              title={hasScissor ? 'Split here' : 'Click to cut'}
                            >
                              <Scissors className="w-4 h-4" />
                            </button>
                            <span
                              className={`text-[9px] font-mono mt-1 ${
                                hasScissor ? 'text-red-400 font-semibold' : 'text-surface-600'
                              }`}
                            >
                              {hasScissor ? 'Cut' : 'Join'}
                            </span>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </main>

          {/* ─── RIGHT: Dedicated Studio Sidebar (Matching iLovePDF) */}
          <aside className="w-80 sm:w-96 bg-surface-900 border-l border-surface-800/80 flex flex-col justify-between shrink-0 shadow-2xl z-20">
            {/* Sidebar Content */}
            <div className="p-6 overflow-y-auto">
              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-6">Split</h2>

              {/* Mode Selector Tabs (Range / Pages / Scissors) */}
              <div className="grid grid-cols-3 border border-surface-700/80 rounded-xl overflow-hidden mb-6 bg-surface-950/60">
                {/* 1. Range Tab */}
                <button
                  onClick={() => setTabMode('range')}
                  className={`py-3 px-2 flex flex-col items-center justify-center gap-1.5 transition-all text-xs border-r border-surface-800 ${
                    tabMode === 'range'
                      ? 'bg-surface-800 text-white font-semibold'
                      : 'text-surface-400 hover:text-white hover:bg-surface-800/40'
                  }`}
                >
                  <span className="font-mono text-xs">[O-O]</span>
                  <span>Range</span>
                </button>

                {/* 2. Pages Tab (With active check badge) */}
                <button
                  onClick={() => setTabMode('pages')}
                  className={`py-3 px-2 flex flex-col items-center justify-center gap-1.5 transition-all text-xs relative border-r border-surface-800 ${
                    tabMode === 'pages'
                      ? 'bg-surface-800 text-white font-semibold'
                      : 'text-surface-400 hover:text-white hover:bg-surface-800/40'
                  }`}
                >
                  {tabMode === 'pages' && (
                    <div className="absolute top-1.5 right-2 w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                  <Split className="w-4 h-4" />
                  <span>Pages</span>
                </button>

                {/* 3. Scissors Tab */}
                <button
                  onClick={() => setTabMode('scissors')}
                  className={`py-3 px-2 flex flex-col items-center justify-center gap-1.5 transition-all text-xs ${
                    tabMode === 'scissors'
                      ? 'bg-surface-800 text-white font-semibold'
                      : 'text-surface-400 hover:text-white hover:bg-surface-800/40'
                  }`}
                >
                  <Scissors className="w-4 h-4" />
                  <span>Scissors</span>
                </button>
              </div>

              {/* ─── Mode: Pages (Extract Mode) ───────────────────── */}
              {tabMode === 'pages' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-surface-300 block mb-2">
                      Extract mode:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setExtractSubMode('all');
                          setPages((prev) => prev.map((p) => ({ ...p, selected: true })));
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                          extractSubMode === 'all'
                            ? 'border-red-500 bg-red-500/10 text-white ring-1 ring-red-500'
                            : 'border-surface-700 bg-surface-800/50 text-surface-400 hover:text-white'
                        }`}
                      >
                        Extract all pages
                      </button>

                      <button
                        onClick={() => setExtractSubMode('select')}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                          extractSubMode === 'select'
                            ? 'border-red-500 bg-red-500/10 text-white ring-1 ring-red-500'
                            : 'border-surface-700 bg-surface-800/50 text-surface-400 hover:text-white'
                        }`}
                      >
                        Select pages
                      </button>
                    </div>
                  </div>

                  {extractSubMode === 'select' && (
                    <div>
                      <label className="text-xs font-semibold text-surface-300 block mb-1.5">
                        Pages to extract:
                      </label>
                      <input
                        type="text"
                        value={extractPagesInput}
                        onChange={(e) => handleExtractInputChange(e.target.value)}
                        placeholder="e.g. 1-2, 4"
                        className="input text-sm w-full font-mono bg-surface-950 border-surface-700 focus:border-red-500"
                      />
                      <span className="text-[11px] text-surface-500 mt-1 block">
                        Click on pages in the canvas to select/deselect
                      </span>
                    </div>
                  )}

                  {/* Merge Checkbox */}
                  <label className="flex items-center gap-2.5 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={mergeExtracted}
                      onChange={(e) => setMergeExtracted(e.target.checked)}
                      className="rounded border-surface-700 text-red-500 focus:ring-red-500 w-4 h-4"
                    />
                    <span className="text-xs text-surface-300">
                      Merge extracted pages into one PDF file.
                    </span>
                  </label>
                </div>
              )}

              {/* ─── Mode: Range ───────────────────────────────────── */}
              {tabMode === 'range' && (
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-surface-300 block">
                    Custom page ranges:
                  </label>
                  {ranges.map((r, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={r}
                        onChange={(e) => {
                          const updated = [...ranges];
                          updated[idx] = e.target.value;
                          setRanges(updated);
                        }}
                        placeholder="e.g. 1-5"
                        className="input text-sm font-mono w-full"
                      />
                      {ranges.length > 1 && (
                        <button
                          onClick={() => setRanges(ranges.filter((_, i) => i !== idx))}
                          className="btn-icon p-1.5 text-surface-500 hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setRanges([...ranges, ''])}
                    className="btn-ghost text-xs text-red-400 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Range
                  </button>
                </div>
              )}

              {/* ─── Mode: Scissors ────────────────────────────────── */}
              {tabMode === 'scissors' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-surface-300">
                      Cuts placed: {cutAfterPages.size}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSplitAllScissors}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Split all
                      </button>
                      <span className="text-surface-600">•</span>
                      <button
                        onClick={handleJoinAllScissors}
                        className="text-xs text-surface-400 hover:underline"
                      >
                        Join all
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-surface-400">
                    Click the scissor cutter between any two pages in the workspace to cut or join.
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                  {error}
                </div>
              )}
            </div>

            {/* ─── Bottom CTA Action Button (Prominent iLovePDF Style) */}
            <div className="p-6 border-t border-surface-800 bg-surface-900/90">
              {!result ? (
                <button
                  onClick={handleSplit}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-base shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Splitting...
                    </>
                  ) : (
                    <>
                      <span>Split PDF</span>
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </button>
              ) : (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle2 className="w-5 h-5" /> Split Complete!
                  </div>
                  <a
                    href={result.path}
                    download
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" /> Download {result.type === 'zip' ? 'ZIP' : 'PDF'}
                  </a>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Full Page Popup Preview Modal */}
      <PagePreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={file?.name ? `${file.name} - Page ${previewPageNum}` : 'Preview'}
        currentPage={previewPageNum}
        totalPages={pages.length}
        onPageChange={(p) => handleOpenPreview(p)}
        pageImageUrl={currentPreviewItem?.previewUrl || currentPreviewItem?.thumbUrl}
      />
    </div>
  );
}
