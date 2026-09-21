/**
 * Merge Page - Studio 2-Column Layout (Matching iLovePDF style)
 * Left visual files canvas + Right tool options sidebar with prominent CTA
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Merge, Upload, Trash2, Download, Plus, Loader2,
  ArrowRight, ArrowUp, ArrowDown, Eye, Check, CheckCircle2,
  FileText, CheckSquare, Square
} from 'lucide-react';
import Navbar from '../components/Navbar';
import PagePreviewModal from '../components/PagePreviewModal';
import { pdfAPI } from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface MergeItem {
  id: string;
  file: File;
  name: string;
  size: number;
  pageCount: number;
  thumbUrl: string;
  previewUrls: Record<number, string>;
  selected: boolean;
}

export default function MergePage() {
  const [files, setFiles] = useState<MergeItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<{ path: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview modal
  const [previewFile, setPreviewFile] = useState<MergeItem | null>(null);
  const [previewPageNum, setPreviewPageNum] = useState<number>(1);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);

  // Load thumbnails and page counts
  const handleAddFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const pdfs = Array.from(fileList).filter((f) => f.type === 'application/pdf');

    const newItems: MergeItem[] = [];

    for (const f of pdfs) {
      const id = Math.random().toString(36).slice(2);
      let pageCount = 1;
      let thumbUrl = '';

      try {
        const buf = await f.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
        pageCount = pdfDoc.numPages;

        const p1 = await pdfDoc.getPage(1);
        const vp = p1.getViewport({ scale: 0.35 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d')!;
        await p1.render({ canvasContext: ctx, viewport: vp }).promise;
        thumbUrl = canvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {
        console.error('Thumbnail error:', e);
      }

      newItems.push({
        id,
        file: f,
        name: f.name,
        size: f.size,
        pageCount,
        thumbUrl,
        previewUrls: {},
        selected: true,
      });
    }

    setFiles((prev) => [...prev, ...newItems]);
    setResult(null);
    setError(null);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setResult(null);
  };

  const toggleSelect = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, selected: !f.selected } : f))
    );
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setFiles((prev) => {
      const copy = [...prev];
      const tmp = copy[idx - 1];
      copy[idx - 1] = copy[idx];
      copy[idx] = tmp;
      return copy;
    });
  };

  const moveDown = (idx: number) => {
    if (idx === files.length - 1) return;
    setFiles((prev) => {
      const copy = [...prev];
      const tmp = copy[idx + 1];
      copy[idx + 1] = copy[idx];
      copy[idx] = tmp;
      return copy;
    });
  };

  // Open Full Preview
  const handleOpenPreview = async (item: MergeItem, pageNum = 1) => {
    setPreviewFile(item);
    setPreviewPageNum(pageNum);
    setPreviewOpen(true);

    if (!item.previewUrls[pageNum]) {
      try {
        const buf = await item.file.arrayBuffer();
        const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
        const p = await pdfDoc.getPage(pageNum);
        const vp = p.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        const ctx = canvas.getContext('2d')!;
        await p.render({ canvasContext: ctx, viewport: vp }).promise;
        const highRes = canvas.toDataURL('image/jpeg', 0.9);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? { ...f, previewUrls: { ...f.previewUrls, [pageNum]: highRes } }
              : f
          )
        );
      } catch (err) {
        console.error('Preview error:', err);
      }
    }
  };

  const handleMerge = async () => {
    const selected = files.filter((f) => f.selected);
    if (selected.length < 2) {
      setError('Please select at least 2 PDF documents to merge');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await pdfAPI.merge(selected.map((f) => f.file));
      setResult(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Merge failed');
    }

    setIsProcessing(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const selectedCount = files.filter((f) => f.selected).length;
  const totalSelectedPages = files
    .filter((f) => f.selected)
    .reduce((acc, f) => acc + f.pageCount, 0);

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden select-none">
      <Navbar />

      {files.length === 0 ? (
        /* Empty Upload Screen */
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="card p-10 max-w-lg w-full text-center border-surface-800 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Merge className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Merge PDF files</h1>
            <p className="text-surface-400 text-sm mb-6">
              Combine multiple PDFs in the exact order you want with real-time thumbnail inspection.
            </p>
            <div
              className="dropzone cursor-pointer py-12"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleAddFiles(e.dataTransfer.files);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => handleAddFiles(e.target.files)}
              />
              <Upload className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-white font-semibold text-base mb-1">Select PDF files</p>
              <p className="text-surface-500 text-xs">or drop PDFs here</p>
            </div>
          </div>
        </div>
      ) : (
        /* ─── 2-Column iLovePDF Studio Layout ──────────────────── */
        <div className="flex flex-1 overflow-hidden">
          {/* ─── LEFT: Main Visual Files Canvas (Flex-1) ────────── */}
          <main className="flex-1 bg-surface-950 overflow-y-auto p-8 relative">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-surface-800/60">
                <span className="text-sm font-semibold text-white">
                  Files to combine ({files.length})
                </span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-red-400" /> Add more files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleAddFiles(e.target.files)}
                />
              </div>

              {/* Grid of PDF Sheets */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-8 py-4">
                {files.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex flex-col items-center group relative cursor-pointer"
                    onClick={() => toggleSelect(item.id)}
                  >
                    {/* Paper Sheet Representation */}
                    <div
                      className={`relative w-44 aspect-[3/4.2] bg-white rounded-md shadow-xl transition-all duration-200 border overflow-hidden flex flex-col justify-between ${
                        item.selected
                          ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-emerald-500/10'
                          : 'border-surface-700/60 opacity-60 hover:opacity-100'
                      }`}
                    >
                      {/* Top Left Checkmark Badge */}
                      <div
                        className={`absolute top-2.5 left-2.5 z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          item.selected
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'bg-black/40 text-transparent hover:bg-black/60 border border-white/60'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>

                      {/* Top Right Quick Delete / Preview */}
                      <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPreview(item, 1);
                          }}
                          className="w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center shadow"
                          title="Inspect Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(item.id);
                          }}
                          className="w-6 h-6 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center shadow"
                          title="Remove File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Sheet Content */}
                      <div className="w-full flex-1 p-2 flex items-center justify-center overflow-hidden bg-white">
                        {item.thumbUrl ? (
                          <img
                            src={item.thumbUrl}
                            alt={item.name}
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <FileText className="w-12 h-12 text-gray-400" />
                        )}
                      </div>

                      {/* Bottom Sheet File Name Tag */}
                      <div className="h-6 bg-white/95 px-2 text-center text-[10px] text-gray-700 flex items-center justify-center border-t border-gray-100 font-medium truncate select-none">
                        {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                      </div>
                    </div>

                    <span className="text-xs text-surface-300 font-medium mt-2 truncate max-w-[176px] text-center">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* ─── RIGHT: Dedicated Studio Sidebar (Matching iLovePDF) */}
          <aside className="w-80 sm:w-96 bg-surface-900 border-l border-surface-800/80 flex flex-col justify-between shrink-0 shadow-2xl z-20">
            <div className="p-6 overflow-y-auto">
              <h2 className="text-2xl font-bold text-white text-center mb-6">Merge PDF</h2>

              {/* Summary Stats Card */}
              <div className="p-4 rounded-xl bg-surface-950/80 border border-surface-800 mb-6 space-y-2 text-xs">
                <div className="flex justify-between text-surface-400">
                  <span>Selected Documents:</span>
                  <span className="text-white font-semibold">{selectedCount} of {files.length}</span>
                </div>
                <div className="flex justify-between text-surface-400">
                  <span>Total Pages:</span>
                  <span className="text-white font-semibold">{totalSelectedPages} pages</span>
                </div>
              </div>

              {/* Order List */}
              <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider block mb-3">
                Merge Sequence
              </span>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {files.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                      item.selected
                        ? 'border-surface-700 bg-surface-800/80 text-white'
                        : 'border-surface-800/40 opacity-50 bg-surface-950 text-surface-500'
                    }`}
                  >
                    <span className="truncate max-w-[180px] font-medium">
                      {idx + 1}. {item.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="btn-icon p-1 disabled:opacity-20 text-surface-400 hover:text-white"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === files.length - 1}
                        className="btn-icon p-1 disabled:opacity-20 text-surface-400 hover:text-white"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                  {error}
                </div>
              )}
            </div>

            {/* Bottom CTA Action Button */}
            <div className="p-6 border-t border-surface-800 bg-surface-900/90">
              {!result ? (
                <button
                  onClick={handleMerge}
                  disabled={isProcessing || selectedCount < 2}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-base shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Merging {selectedCount} PDFs...
                    </>
                  ) : (
                    <>
                      <span>Merge PDF</span>
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </button>
              ) : (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle2 className="w-5 h-5" /> Merge Complete!
                  </div>
                  <a
                    href={result.path}
                    download="merged_document.pdf"
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" /> Download Merged PDF
                  </a>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Full Preview Modal */}
      {previewFile && (
        <PagePreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          title={`${previewFile.name} - Full Preview`}
          currentPage={previewPageNum}
          totalPages={previewFile.pageCount}
          onPageChange={(p) => handleOpenPreview(previewFile, p)}
          pageImageUrl={
            previewFile.previewUrls[previewPageNum] ||
            (previewPageNum === 1 ? previewFile.thumbUrl : undefined)
          }
        />
      )}
    </div>
  );
}
