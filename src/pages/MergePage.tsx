/**
 * Merge Page - Studio 2-Column Layout (Matching iLovePDF style)
 * Left visual files canvas + Right tool options sidebar with prominent CTA
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Merge, Upload, Trash2, Download, Plus, Loader2,
  ArrowRight, ArrowUp, ArrowDown, Eye, Check, CheckCircle2,
  FileText, CheckSquare, Square, Edit3
} from 'lucide-react';
import Navbar from '../components/Navbar';
import PagePreviewModal from '../components/PagePreviewModal';
import { pdfAPI, downloadFile } from '../services/api';
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
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [customFileName, setCustomFileName] = useState<string>('merged_document.pdf');
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

    if (files.length === 0 && pdfs.length > 0) {
      const baseName = pdfs[0].name.replace(/\.[^/.]+$/, '');
      setCustomFileName(`${baseName}_merged.pdf`);
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

  const handleDownload = async () => {
    if (!result?.path) return;
    setIsDownloading(true);
    setError(null);
    try {
      await downloadFile(result.path, customFileName);
    } catch (err: any) {
      setError(err.message || 'Download failed');
    } finally {
      setIsDownloading(false);
    }
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
        /* Studio 2-Column Interface */
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Visual Interactive Document Canvas */}
          <main className="flex-1 bg-surface-950 flex flex-col min-w-0 border-r border-surface-800">
            {/* Top Toolbar */}
            <div className="h-14 px-6 border-b border-surface-800 flex items-center justify-between bg-surface-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">
                  Files to combine ({files.length})
                </span>
                <span className="text-xs text-surface-500">
                  • {selectedCount} selected • {totalSelectedPages} total pages
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-red-400" />
                  <span>Add more files</span>
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
            </div>

            {/* Document Thumbnails Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {files.map((item, index) => (
                  <div
                    key={item.id}
                    className={`group relative bg-surface-900 rounded-xl border transition-all duration-200 flex flex-col overflow-hidden shadow-lg ${
                      item.selected
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/5'
                        : 'border-surface-800 opacity-60 hover:opacity-100 hover:border-surface-700'
                    }`}
                  >
                    {/* Top Order Badge & Checkbox */}
                    <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shadow ${
                          item.selected
                            ? 'bg-emerald-500 text-white'
                            : 'bg-surface-800/90 text-surface-400 hover:text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <span className="bg-surface-950/80 backdrop-blur-sm text-surface-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-surface-700">
                        #{index + 1}
                      </span>
                    </div>

                    {/* Action Overlay Buttons (Remove & Full Preview) */}
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenPreview(item, 1)}
                        className="w-6 h-6 rounded bg-surface-800/90 text-surface-300 hover:text-white flex items-center justify-center shadow backdrop-blur-sm"
                        title="Quick Preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeFile(item.id)}
                        className="w-6 h-6 rounded bg-red-500/80 text-white hover:bg-red-600 flex items-center justify-center shadow backdrop-blur-sm"
                        title="Remove Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Page 1 Thumbnail Canvas / Image */}
                    <div
                      className="aspect-[1/1.414] bg-white flex items-center justify-center p-2 relative cursor-pointer group-hover:scale-[1.02] transition-transform"
                      onClick={() => handleOpenPreview(item, 1)}
                    >
                      {item.thumbUrl ? (
                        <img
                          src={item.thumbUrl}
                          alt={item.name}
                          className="max-w-full max-h-full object-contain shadow-sm pointer-events-none"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-surface-400">
                          <FileText className="w-8 h-8 text-surface-300 mb-1" />
                          <span className="text-[10px] font-medium text-surface-400">Page 1</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Info */}
                    <div className="p-2.5 bg-surface-900 border-t border-surface-800/60 flex flex-col justify-between">
                      <p className="text-xs font-semibold text-white truncate" title={item.name}>
                        {item.name}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-surface-400 mt-1">
                        <span className="font-mono bg-surface-800/60 px-1.5 py-0.5 rounded text-[10px]">
                          {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                        </span>
                        <span>{formatSize(item.size)}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Same-size Interactive "Add More Files" Card in Grid */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative bg-surface-900/40 hover:bg-surface-900/90 rounded-xl border-2 border-dashed border-surface-700/80 hover:border-red-500/80 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer shadow-md hover:shadow-xl hover:shadow-red-500/10 min-h-[220px] aspect-[1/1.55] p-4 text-center select-none overflow-hidden"
                  title="Click to add more PDF documents"
                >
                  <div className="w-12 h-12 rounded-2xl bg-surface-800/80 group-hover:bg-red-500/15 border border-surface-700 group-hover:border-red-500/30 flex items-center justify-center mb-2.5 transition-all group-hover:scale-110 shadow-sm">
                    <Plus className="w-6 h-6 text-surface-400 group-hover:text-red-400 transition-colors" />
                  </div>
                  <span className="text-xs font-bold text-surface-300 group-hover:text-white transition-colors">
                    Add More Files
                  </span>
                  <span className="text-[10px] text-surface-500 mt-1">
                    Select PDF to combine
                  </span>
                </div>
              </div>
            </div>
          </main>

          {/* RIGHT: Tool Configuration Sidebar */}
          <aside className="w-80 lg:w-96 bg-surface-900/60 flex flex-col shrink-0">
            {/* Sidebar Header */}
            <div className="p-6 border-b border-surface-800">
              <h2 className="text-xl font-bold text-white mb-1">Merge PDF</h2>
              <p className="text-xs text-surface-400">
                Arrange files in the sequence you want them to appear in the merged output.
              </p>
            </div>

            {/* Sidebar Body Options */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Summary Metrics */}
              <div className="p-4 rounded-xl bg-surface-950/60 border border-surface-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400">Selected Documents:</span>
                  <span className="text-white font-semibold">{selectedCount} of {files.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-surface-400">Total Pages:</span>
                  <span className="text-emerald-400 font-bold">{totalSelectedPages} pages</span>
                </div>
              </div>

              {/* Merge Sequence Reordering */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                    Merge Sequence
                  </label>
                  <span className="text-[10px] text-surface-500">Click arrows to order</span>
                </div>

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
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                  {error}
                </div>
              )}
            </div>

            {/* Bottom CTA Action Button */}
            <div className="p-6 border-t border-surface-800 bg-surface-900/90">
              {!result ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-surface-300 mb-1.5 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-red-400" />
                      Output File Name
                    </label>
                    <div className="flex items-center gap-2 bg-surface-950 border border-surface-700 focus-within:border-red-500 rounded-xl px-3 py-2.5 transition-all">
                      <input
                        type="text"
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        placeholder="merged_document.pdf"
                        className="bg-transparent text-white text-xs font-medium w-full outline-none"
                      />
                    </div>
                  </div>

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
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold mb-1">
                      <CheckCircle2 className="w-5 h-5" /> Merge Complete!
                    </div>
                    <p className="text-xs text-surface-400">
                      {result.size ? `${formatSize(result.size)} • ` : ''}Ready to download
                    </p>
                  </div>

                  {/* Rename Box */}
                  <div className="bg-surface-950 border border-surface-800 rounded-xl p-3">
                    <label className="block text-xs font-semibold text-surface-300 mb-1.5 flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                      Rename Merged File
                    </label>
                    <div className="flex items-center gap-2 bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 focus-within:border-emerald-500 transition-colors">
                      <input
                        type="text"
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        placeholder="Enter file name (e.g. document.pdf)"
                        className="bg-transparent text-white text-xs font-medium w-full outline-none"
                      />
                    </div>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" /> Download Merged PDF
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setResult(null)}
                    className="w-full py-2 text-xs text-surface-400 hover:text-white transition-colors"
                  >
                    ← Reorder or merge again
                  </button>
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
