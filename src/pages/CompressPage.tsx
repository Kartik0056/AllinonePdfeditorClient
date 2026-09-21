/**
 * Compress Page - Studio 2-Column Layout (Matching iLovePDF style)
 * Left visual document canvas + Right compression levels sidebar with prominent CTA
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Shrink, Upload, FileText, Download, Loader2,
  ArrowRight, CheckCircle2, TrendingDown, Eye, Check
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { pdfAPI } from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type Level = 'high' | 'medium' | 'low';

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>('medium');
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.type !== 'application/pdf') {
      setError('Please select a valid PDF file');
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);

    // Generate preview
    try {
      const buf = await f.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: buf }).promise;
      setPageCount(pdfDoc.numPages);
      const p1 = await pdfDoc.getPage(1);
      const vp = p1.getViewport({ scale: 0.4 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d')!;
      await p1.render({ canvasContext: ctx, viewport: vp }).promise;
      setThumbUrl(canvas.toDataURL('image/jpeg', 0.85));
    } catch (e) {
      console.error('Compress preview error:', e);
    }
  };

  const handleCompress = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const response = await pdfAPI.compress(file, level);
      setResult(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Compression failed');
    }

    setIsProcessing(false);
  };

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden select-none">
      <Navbar />

      {!file ? (
        /* Empty Upload View */
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="card p-10 max-w-lg w-full text-center border-surface-800 shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Shrink className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Compress PDF file</h1>
            <p className="text-surface-400 text-sm mb-6">
              Reduce file size up to 80% while maintaining the highest PDF quality.
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
          {/* ─── LEFT: Main Document Sheet Canvas (Flex-1) ──────── */}
          <main className="flex-1 bg-surface-950 overflow-y-auto p-8 relative flex items-center justify-center">
            <div className="flex flex-col items-center">
              {/* Paper Sheet Preview */}
              <div className="relative w-56 aspect-[3/4.2] bg-white rounded-md shadow-2xl border border-surface-700/80 overflow-hidden flex flex-col justify-between mb-4">
                <div className="w-full flex-1 p-3 flex items-center justify-center bg-white overflow-hidden">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt="PDF Preview"
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <FileText className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <div className="h-7 bg-white/95 px-2 text-center text-xs text-gray-700 flex items-center justify-center border-t border-gray-100 font-semibold select-none">
                  Page 1 of {pageCount}
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-white truncate max-w-sm mb-1">{file.name}</p>
                <div className="flex items-center justify-center gap-2 text-xs text-surface-400">
                  <span className="font-mono">{formatSize(file.size)}</span>
                  <span>•</span>
                  <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                  <span>•</span>
                  <button
                    onClick={() => {
                      setFile(null);
                      setResult(null);
                      setThumbUrl(null);
                    }}
                    className="text-red-400 hover:underline"
                  >
                    Change file
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* ─── RIGHT: Dedicated Studio Sidebar (Matching iLovePDF) */}
          <aside className="w-80 sm:w-96 bg-surface-900 border-l border-surface-800/80 flex flex-col justify-between shrink-0 shadow-2xl z-20">
            <div className="p-6 overflow-y-auto">
              <h2 className="text-2xl font-bold text-white text-center mb-6">Compression level</h2>

              {/* Compression Mode Selector Cards */}
              <div className="space-y-3 mb-6">
                {[
                  {
                    id: 'high',
                    title: 'Extreme Compression',
                    desc: 'Less quality, high compression (up to 80% reduction)',
                    color: 'text-red-400',
                  },
                  {
                    id: 'medium',
                    title: 'Recommended Compression',
                    desc: 'Good quality, good compression (approx 65% reduction)',
                    color: 'text-emerald-400',
                  },
                  {
                    id: 'low',
                    title: 'Less Compression',
                    desc: 'High quality, less compression (approx 40% reduction)',
                    color: 'text-blue-400',
                  },
                ].map((item) => {
                  const isSelected = level === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setLevel(item.id as Level)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500 shadow-md'
                          : 'border-surface-800 bg-surface-950/60 hover:border-surface-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white">{item.title}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-red-500 bg-red-500 text-white'
                              : 'border-surface-600'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-xs text-surface-400">{item.desc}</p>
                    </div>
                  );
                })}
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
                <button
                  onClick={handleCompress}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-base shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Compressing PDF...
                    </>
                  ) : (
                    <>
                      <span>Compress PDF</span>
                      <ArrowRight className="w-5 h-5 ml-1" />
                    </>
                  )}
                </button>
              ) : (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-semibold">
                    <CheckCircle2 className="w-5 h-5" /> Compressed by {result.reduction}%!
                  </div>
                  <div className="flex justify-between text-xs text-surface-400 px-2 font-mono">
                    <span>{formatSize(result.originalSize)}</span>
                    <TrendingDown className="w-3.5 h-3.5 text-emerald-400 inline" />
                    <span className="text-emerald-400 font-bold">{formatSize(result.compressedSize)}</span>
                  </div>
                  <a
                    href={result.path}
                    download="compressed_document.pdf"
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" /> Download Compressed PDF
                  </a>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
