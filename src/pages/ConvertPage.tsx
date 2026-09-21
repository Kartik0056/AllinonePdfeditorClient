/**
 * Convert Page - PDF to Image, Advanced Smart Background Remover (Object Preserving), Image to PDF & Image Convert
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  RefreshCw, Upload, Download, Loader2, ArrowRight, FileText,
  Image as ImageIcon, Sparkles, Sliders, CheckCircle2, Layers, Eye,
  Paintbrush, Eraser, Wand2, Crop, RotateCcw, Check
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { convertAPI } from '../services/api';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import JSZip from 'jszip';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

type ConvertMode = 'pdf-to-image' | 'bg-remover' | 'image-to-pdf' | 'image-convert';
type BgTool = 'auto' | 'box' | 'wand' | 'keep' | 'erase';

interface ConvertedPage {
  pageNumber: number;
  dataUrl: string;
  blob: Blob;
}

export default function ConvertPage() {
  const [mode, setMode] = useState<ConvertMode>('pdf-to-image');
  const [files, setFiles] = useState<File[]>([]);
  const [targetFormat, setTargetFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [imageTargetFormat, setImageTargetFormat] = useState<'jpg' | 'png' | 'webp' | 'heic' | 'tiff' | 'gif' | 'avif'>('jpg');
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [quality, setQuality] = useState(85);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF to Image state
  const [pdfPages, setPdfPages] = useState<ConvertedPage[]>([]);
  const [renderScale, setRenderScale] = useState<number>(2);

  // ─── Smart Background Remover State ─────────────────────────
  const [bgTool, setBgTool] = useState<BgTool>('auto');
  const [bgOriginalImage, setBgOriginalImage] = useState<string | null>(null);
  const [bgProcessedImage, setBgProcessedImage] = useState<string | null>(null);
  const [bgTolerance, setBgTolerance] = useState<number>(30);
  const [bgEdgeSensitivity, setBgEdgeSensitivity] = useState<number>(35);
  const [bgBrushSize, setBgBrushSize] = useState<number>(25);
  const [bgPreviewMode, setBgPreviewMode] = useState<'checker' | 'white' | 'black'>('checker');

  // Canvas refs & interactive overlay state
  const rawImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [boxSelection, setBoxSelection] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // ─── File Selection ────────────────────────────────────────

  const handleFileSelect = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const selected = Array.from(fileList);
    setFiles(selected);
    setResult(null);
    setError(null);
    setPdfPages([]);
    setBgProcessedImage(null);
    setBoxSelection(null);

    const firstFile = selected[0];

    if (mode === 'pdf-to-image' && firstFile.type === 'application/pdf') {
      await renderPdfToImages(firstFile, targetFormat, renderScale, quality);
    }

    if (mode === 'bg-remover' && firstFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setBgOriginalImage(dataUrl);

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          rawImageRef.current = img;
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;

          // Initialize mask canvas
          const mCanvas = document.createElement('canvas');
          mCanvas.width = w;
          mCanvas.height = h;
          maskCanvasRef.current = mCanvas;

          // Run smart segmentation preserving solid object
          runSmartSegmentation(img, bgTolerance, bgEdgeSensitivity, null);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(firstFile);
    }
  };

  // ─── PDF to Image Conversion ───────────────────────────────

  const renderPdfToImages = async (
    pdfFile: File,
    format: 'png' | 'jpeg' | 'webp',
    scale: number,
    qual: number
  ) => {
    setIsProcessing(true);
    setError(null);
    setPdfPages([]);

    try {
      const buffer = await pdfFile.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
      const pagesOut: ConvertedPage[] = [];
      const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        if (format === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;

        const dataUrl = canvas.toDataURL(mime, qual / 100);
        const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), mime, qual / 100));

        pagesOut.push({ pageNumber: i, dataUrl, blob });
      }

      setPdfPages(pagesOut);
    } catch (err: any) {
      console.error('PDF to Image error:', err);
      setError('Failed to convert PDF: ' + (err.message || 'Unknown error'));
    }

    setIsProcessing(false);
  };

  const downloadAllPagesZip = async () => {
    if (pdfPages.length === 0 || !files[0]) return;
    const zip = new JSZip();
    const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;
    const baseName = files[0].name.replace('.pdf', '');

    pdfPages.forEach((p) => {
      zip.file(`${baseName}_page_${p.pageNumber}.${ext}`, p.blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_images.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── State-of-the-Art Smart Object-Preserving Segmentation ─

  const runSmartSegmentation = useCallback(
    (
      img: HTMLImageElement,
      tol: number,
      edgeSens: number,
      bbox: { x1: number; y1: number; x2: number; y2: number } | null,
      wandSeedPoint: { x: number; y: number } | null = null
    ) => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) return;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const totalPixels = w * h;

      // 1. Compute Grayscale & Sobel Edge Map
      const gray = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        gray[i] = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
      }

      const edges = new Float32Array(totalPixels);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const gx =
            -gray[idx - w - 1] + gray[idx - w + 1] +
            -2 * gray[idx - 1] + 2 * gray[idx + 1] +
            -gray[idx + w - 1] + gray[idx + w + 1];
          const gy =
            -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1] +
            gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];
          edges[idx] = Math.sqrt(gx * gx + gy * gy);
        }
      }

      const isBg = new Uint8Array(totalPixels);

      // 2. Read user paint masks (Green = Keep, Red = Erase)
      let maskData: Uint8ClampedArray | null = null;
      if (maskCanvasRef.current) {
        const mctx = maskCanvasRef.current.getContext('2d');
        if (mctx) {
          maskData = mctx.getImageData(0, 0, w, h).data;
        }
      }

      // 3. If Bounding Box provided, mark everything outside as background
      const bx1 = bbox ? Math.max(0, Math.min(bbox.x1, bbox.x2)) : 0;
      const by1 = bbox ? Math.max(0, Math.min(bbox.y1, bbox.y2)) : 0;
      const bx2 = bbox ? Math.min(w - 1, Math.max(bbox.x1, bbox.x2)) : w - 1;
      const by2 = bbox ? Math.min(h - 1, Math.max(bbox.y1, bbox.y2)) : h - 1;

      if (bbox) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (x < bx1 || x > bx2 || y < by1 || y > by2) {
              isBg[y * w + x] = 1;
            }
          }
        }
      }

      // 4. Initialize BFS Queue
      const queue = new Int32Array(totalPixels);
      let qHead = 0, qTail = 0;

      if (wandSeedPoint) {
        const startIdx = wandSeedPoint.y * w + wandSeedPoint.x;
        isBg[startIdx] = 1;
        queue[qTail++] = startIdx;
      } else {
        // Seed from boundaries of the active region (halting at strong edges)
        for (let x = bx1; x <= bx2; x++) {
          const top = by1 * w + x;
          const bot = by2 * w + x;
          if (edges[top] < edgeSens) { isBg[top] = 1; queue[qTail++] = top; }
          if (edges[bot] < edgeSens) { isBg[bot] = 1; queue[qTail++] = bot; }
        }
        for (let y = by1; y <= by2; y++) {
          const l = y * w + bx1;
          const r = y * w + bx2;
          if (edges[l] < edgeSens) { isBg[l] = 1; queue[qTail++] = l; }
          if (edges[r] < edgeSens) { isBg[r] = 1; queue[qTail++] = r; }
        }
      }

      // 5. Run Adaptive BFS Flood Fill halting at object contours
      const edgeBarrier = edgeSens;
      const maxColorDiff = (tol / 100) * 110;

      while (qHead < qTail) {
        const curr = queue[qHead++];
        const cx = curr % w;
        const cy = Math.floor(curr / w);

        const currIdx = curr * 4;
        const cr = data[currIdx], cg = data[currIdx + 1], cb = data[currIdx + 2];

        const neighbors = [
          cx > bx1 ? curr - 1 : -1,
          cx < bx2 ? curr + 1 : -1,
          cy > by1 ? curr - w : -1,
          cy < by2 ? curr + w : -1,
        ];

        for (const n of neighbors) {
          if (n === -1 || isBg[n]) continue;

          // User-painted Keep (Green) pixels are strictly protected
          if (maskData && maskData[n * 4 + 1] > 120 && maskData[n * 4] < 60) continue;

          // Gradient boundary belongs to object outline: STOP!
          if (edges[n] > edgeBarrier) continue;

          // Check neighbor color diff
          const nIdx = n * 4;
          const nr = data[nIdx], ng = data[nIdx + 1], nb = data[nIdx + 2];
          const dr = cr - nr, dg = cg - ng, db = cb - nb;
          const diff = Math.sqrt(dr * dr + dg * dg + db * db);

          if (diff <= maxColorDiff) {
            isBg[n] = 1;
            queue[qTail++] = n;
          }
        }
      }

      // 6. Apply User Erase and Keep Brushes
      if (maskData) {
        for (let i = 0; i < totalPixels; i++) {
          const p = i * 4;
          // Red stroke: force erase to background
          if (maskData[p] > 120 && maskData[p + 1] < 60) {
            isBg[i] = 1;
          }
          // Green stroke: force keep solid object
          if (maskData[p + 1] > 120 && maskData[p] < 60) {
            isBg[i] = 0;
          }
        }
      }

      // 7. Output Alpha: Object is 100% Solid & Opaque!
      for (let i = 0; i < totalPixels; i++) {
        if (isBg[i] === 1) {
          data[i * 4 + 3] = 0; // Transparent
        } else {
          data[i * 4 + 3] = 255; // Solid Object
        }
      }

      ctx.putImageData(imgData, 0, 0);
      setBgProcessedImage(canvas.toDataURL('image/png'));
    },
    []
  );

  // Auto Object Saliency & Boundary Detection
  const handleAutoObjectDetect = () => {
    const img = rawImageRef.current;
    if (!img) return;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data;

    // Grayscale
    const gray = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const idx = i * 4;
      gray[i] = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
    }

    // Sobel gradient energy with central weighting
    const colEnergy = new Float32Array(w);
    const rowEnergy = new Float32Array(h);

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const gx =
          -gray[idx - w - 1] + gray[idx - w + 1] +
          -2 * gray[idx - 1] + 2 * gray[idx + 1] +
          -gray[idx + w - 1] + gray[idx + w + 1];
        const gy =
          -gray[idx - w - 1] - 2 * gray[idx - w] - gray[idx - w + 1] +
          gray[idx + w - 1] + 2 * gray[idx + w] + gray[idx + w + 1];
        const g = Math.sqrt(gx * gx + gy * gy);

        const wx = 1 - (Math.abs(x - w / 2) / (w / 2)) * 0.35;
        const wy = 1 - (Math.abs(y - h / 2) / (h / 2)) * 0.35;
        colEnergy[x] += g * wx * wy;
        rowEnergy[y] += g * wx * wy;
      }
    }

    const avgCol = colEnergy.reduce((a, b) => a + b, 0) / w;
    const avgRow = rowEnergy.reduce((a, b) => a + b, 0) / h;

    let minX = 0, maxX = w - 1, minY = 0, maxY = h - 1;
    while (minX < w && colEnergy[minX] < avgCol * 0.75) minX++;
    while (maxX > 0 && colEnergy[maxX] < avgCol * 0.75) maxX--;
    while (minY < h && rowEnergy[minY] < avgRow * 0.75) minY++;
    while (maxY > 0 && rowEnergy[maxY] < avgRow * 0.75) maxY--;

    const bbox = {
      x1: Math.max(0, minX - 15),
      y1: Math.max(0, minY - 15),
      x2: Math.min(w - 1, maxX + 15),
      y2: Math.min(h - 1, maxY + 15),
    };

    setBoxSelection(bbox);
    runSmartSegmentation(img, bgTolerance, bgEdgeSensitivity, bbox);
  };

  // ─── Interactive Overlay Drawing (60fps Canvas Rendering) ───

  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !rawImageRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw paint mask strokes from maskCanvas with semi-transparency
    if (maskCanvasRef.current) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.drawImage(maskCanvasRef.current, 0, 0);
      ctx.restore();
    }

    // 2. Draw Box Selection (dragging or active)
    const activeBox =
      isDraggingBox && dragStart && dragCurrent
        ? {
            x1: Math.min(dragStart.x, dragCurrent.x),
            y1: Math.min(dragStart.y, dragCurrent.y),
            x2: Math.max(dragStart.x, dragCurrent.x),
            y2: Math.max(dragStart.y, dragCurrent.y),
          }
        : boxSelection;

    if (activeBox) {
      const bx = activeBox.x1;
      const by = activeBox.y1;
      const bw = activeBox.x2 - activeBox.x1;
      const bh = activeBox.y2 - activeBox.y1;

      // Darken outside region
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(0, 0, canvas.width, by);
      ctx.fillRect(0, by + bh, canvas.width, canvas.height - (by + bh));
      ctx.fillRect(0, by, bx, bh);
      ctx.fillRect(bx + bw, by, canvas.width - (bx + bw), bh);

      // Glowing dashed border
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(bx, by, bw, bh);

      // Corner handles
      ctx.fillStyle = '#0ea5e9';
      const handleSize = 10;
      ctx.fillRect(bx - 5, by - 5, handleSize, handleSize);
      ctx.fillRect(bx + bw - 5, by - 5, handleSize, handleSize);
      ctx.fillRect(bx - 5, by + bh - 5, handleSize, handleSize);
      ctx.fillRect(bx + bw - 5, by + bh - 5, handleSize, handleSize);

      // Tag badge
      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      const text = `🎯 Object Area (${bw}×${bh}px)`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(bx, Math.max(0, by - 24), textWidth + 14, 22);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, bx + 7, Math.max(15, by - 8));
      ctx.restore();
    }

    // 3. Draw live brush circular indicator at mouse position
    if (mousePos && (bgTool === 'keep' || bgTool === 'erase')) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, bgBrushSize, 0, Math.PI * 2);
      ctx.strokeStyle = bgTool === 'keep' ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.fillStyle = bgTool === 'keep' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)';
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }, [boxSelection, isDraggingBox, dragStart, dragCurrent, mousePos, bgTool, bgBrushSize]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // Canvas Mouse Interactions
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !rawImageRef.current) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = rawImageRef.current.naturalWidth / rect.width;
    const scaleY = rawImageRef.current.naturalHeight / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY),
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);

    if (bgTool === 'box') {
      setIsDraggingBox(true);
      setDragStart(pos);
      setDragCurrent(pos);
      return;
    }

    if (bgTool === 'wand') {
      if (rawImageRef.current) {
        runSmartSegmentation(rawImageRef.current, bgTolerance, bgEdgeSensitivity, boxSelection, pos);
      }
      return;
    }

    if (bgTool === 'keep' || bgTool === 'erase') {
      setIsPainting(true);
      paintBrushAt(pos.x, pos.y, bgTool);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    setMousePos(pos);

    if (isDraggingBox) {
      setDragCurrent(pos);
      drawOverlay();
      return;
    }

    if (isPainting && (bgTool === 'keep' || bgTool === 'erase')) {
      paintBrushAt(pos.x, pos.y, bgTool);
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingBox && dragStart && dragCurrent && rawImageRef.current) {
      setIsDraggingBox(false);
      const bbox = {
        x1: Math.min(dragStart.x, dragCurrent.x),
        y1: Math.min(dragStart.y, dragCurrent.y),
        x2: Math.max(dragStart.x, dragCurrent.x),
        y2: Math.max(dragStart.y, dragCurrent.y),
      };
      setBoxSelection(bbox);
      runSmartSegmentation(rawImageRef.current, bgTolerance, bgEdgeSensitivity, bbox);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    if (isPainting && rawImageRef.current) {
      setIsPainting(false);
      runSmartSegmentation(rawImageRef.current, bgTolerance, bgEdgeSensitivity, boxSelection);
    }
  };

  const paintBrushAt = (cx: number, cy: number, tool: 'keep' | 'erase') => {
    if (!maskCanvasRef.current) return;
    const mctx = maskCanvasRef.current.getContext('2d');
    if (!mctx) return;

    mctx.save();
    mctx.fillStyle = tool === 'keep' ? '#00ff00' : '#ff0000';
    mctx.beginPath();
    mctx.arc(cx, cy, bgBrushSize, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();

    drawOverlay();
  };

  // Reset masks & selections
  const handleResetBgTools = () => {
    setBoxSelection(null);
    if (maskCanvasRef.current && rawImageRef.current) {
      const mctx = maskCanvasRef.current.getContext('2d');
      if (mctx) {
        mctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      }
      runSmartSegmentation(rawImageRef.current, bgTolerance, bgEdgeSensitivity, null);
    }
    drawOverlay();
  };

  // Export on pure white background (for Amazon/Shopify product photos)
  const downloadWhiteBgJpg = () => {
    if (!bgProcessedImage || !rawImageRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = rawImageRef.current.naturalWidth;
    canvas.height = rawImageRef.current.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const url = canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${files[0].name.replace(/\.[^/.]+$/, '')}_white_bg.jpg`;
      a.click();
    };
    img.src = bgProcessedImage;
  };

  // ─── Standard Image to PDF / Image Convert ──────────────────

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleStandardConvert = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setError(null);

    try {
      if (mode === 'image-to-pdf') {
        const response = await convertAPI.imageToPdf(files, { pageSize, orientation });
        setResult(response.data.data);
      } else if (mode === 'image-convert') {
        if (files.length === 1) {
          const response = await convertAPI.imageConvert(files[0], imageTargetFormat, quality);
          setResult(response.data.data);
        } else {
          const response = await convertAPI.imagesBatchConvert(files, imageTargetFormat, quality);
          setResult(response.data.data);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Conversion failed');
    }

    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-surface-950 overflow-y-auto select-none">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
            <RefreshCw className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Convert & Magic Tools</h1>
            <p className="text-surface-400 text-xs mt-0.5">
              Advanced smart background removal (object-protecting), PDF to JPG/PNG, and format conversion.
            </p>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              id: 'bg-remover',
              label: '✨ Smart BG Remover',
              desc: 'Protects objects, removes background',
              icon: Sparkles,
              color: 'text-amber-400',
            },
            {
              id: 'pdf-to-image',
              label: 'PDF → Image',
              desc: 'Convert PDF to JPG, PNG, WEBP',
              icon: ImageIcon,
              color: 'text-blue-400',
            },
            {
              id: 'image-to-pdf',
              label: 'Image → PDF',
              desc: 'Convert photos to PDF',
              icon: FileText,
              color: 'text-purple-400',
            },
            {
              id: 'image-convert',
              label: '⚡ Studio Image Converter',
              desc: 'JPG, PNG, HEIC, WEBP, AVIF, TIFF',
              icon: RefreshCw,
              color: 'text-emerald-400',
            },
          ].map((m) => {
            const Icon = m.icon;
            const isSelected = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id as ConvertMode);
                  setFiles([]);
                  setResult(null);
                  setError(null);
                  setPdfPages([]);
                  setBgOriginalImage(null);
                  setBgProcessedImage(null);
                  setBoxSelection(null);
                }}
                className={`card p-4 text-left transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/10 ring-1 ring-primary-500'
                    : 'hover:border-surface-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={`w-4 h-4 ${m.color}`} />
                  <span className="text-sm font-semibold text-white">{m.label}</span>
                </div>
                <p className="text-xs text-surface-500">{m.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Upload dropzone if no files selected */}
        {files.length === 0 ? (
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
              accept={
                mode === 'pdf-to-image'
                  ? '.pdf'
                  : 'image/*,.heic,.heif,.tiff,.tif,.avif,.webp,.png,.jpg,.jpeg,.gif'
              }
              multiple={mode === 'image-to-pdf' || mode === 'image-convert'}
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <Upload className="w-10 h-10 text-surface-500 mx-auto mb-2" />
            <p className="text-surface-300 font-medium">
              {mode === 'bg-remover'
                ? 'Drop product photo or image here to remove background'
                : mode === 'pdf-to-image'
                ? 'Drop a PDF here to convert to JPG/PNG'
                : mode === 'image-convert'
                ? 'Drop image(s) here — JPG, PNG, HEIC, WEBP, AVIF, TIFF'
                : 'Drop files here or click to browse'}
            </p>
            <p className="text-surface-500 text-xs mt-1">
              {mode === 'bg-remover'
                ? 'Smart edge-contour detection keeps subjects 100% solid & opaque'
                : mode === 'image-convert'
                ? 'Supports single or batch conversions with instant ZIP archive export'
                : 'Fast, secure conversion'}
            </p>
          </div>
        ) : (
          <div>
            {/* File info banner */}
            <div className="card p-4 flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center text-primary-400">
                  {mode === 'pdf-to-image' ? <FileText className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white truncate max-w-md">{files[0].name}</p>
                  <p className="text-xs text-surface-500">
                    {(files[0].size / 1024 / 1024).toFixed(1)} MB • {files.length} file(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFiles([]);
                  setPdfPages([]);
                  setResult(null);
                  setBgOriginalImage(null);
                  setBgProcessedImage(null);
                  setBoxSelection(null);
                }}
                className="btn-ghost text-xs text-surface-400 hover:text-white"
              >
                Change File
              </button>
            </div>

            {/* ─── TAB: SMART BACKGROUND REMOVER (OBJECT PROTECTING) ─ */}
            {mode === 'bg-remover' && (
              <div className="space-y-6">
                {/* Interactive Selection Toolbar */}
                <div className="card p-4 flex flex-wrap items-center justify-between gap-4 border-surface-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider mr-1">
                      Tools:
                    </span>

                    {/* Auto Detect Tool */}
                    <button
                      onClick={handleAutoObjectDetect}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                        bgTool === 'auto'
                          ? 'border-amber-500 bg-amber-500/20 text-white ring-1 ring-amber-500'
                          : 'border-surface-700 bg-surface-800 text-surface-300 hover:text-white'
                      }`}
                      title="1-Click Auto Object Contour Detection"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Auto Object Detect
                    </button>

                    {/* Box Select Tool */}
                    <button
                      onClick={() => setBgTool('box')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                        bgTool === 'box'
                          ? 'border-primary-500 bg-primary-500/20 text-white ring-1 ring-primary-500'
                          : 'border-surface-700 bg-surface-800 text-surface-300 hover:text-white'
                      }`}
                      title="Drag a box around the object to keep it"
                    >
                      <Crop className="w-3.5 h-3.5 text-primary-400" />
                      Box Select Object
                    </button>

                    {/* Magic Wand Tool */}
                    <button
                      onClick={() => setBgTool('wand')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                        bgTool === 'wand'
                          ? 'border-purple-500 bg-purple-500/20 text-white ring-1 ring-purple-500'
                          : 'border-surface-700 bg-surface-800 text-surface-300 hover:text-white'
                      }`}
                      title="Click anywhere on background to erase it"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                      Magic Wand (Click BG)
                    </button>

                    {/* Keep Brush Tool */}
                    <button
                      onClick={() => setBgTool('keep')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                        bgTool === 'keep'
                          ? 'border-emerald-500 bg-emerald-500/20 text-white ring-1 ring-emerald-500'
                          : 'border-surface-700 bg-surface-800 text-surface-300 hover:text-white'
                      }`}
                      title="Paint in green over areas to KEEP solid"
                    >
                      <Paintbrush className="w-3.5 h-3.5 text-emerald-400" />
                      Keep Brush (🟢)
                    </button>

                    {/* Erase Brush Tool */}
                    <button
                      onClick={() => setBgTool('erase')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                        bgTool === 'erase'
                          ? 'border-red-500 bg-red-500/20 text-white ring-1 ring-red-500'
                          : 'border-surface-700 bg-surface-800 text-surface-300 hover:text-white'
                      }`}
                      title="Paint in red over background to ERASE"
                    >
                      <Eraser className="w-3.5 h-3.5 text-red-400" />
                      Erase Brush (🔴)
                    </button>

                    <button
                      onClick={handleResetBgTools}
                      className="btn-ghost text-xs px-2.5 py-1.5 text-surface-400 hover:text-white flex items-center gap-1.5 border border-surface-700 rounded-lg"
                      title="Reset selections and brush marks"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {bgProcessedImage && (
                      <>
                        <button
                          onClick={downloadWhiteBgJpg}
                          className="btn-ghost text-xs px-3 py-2 border border-surface-700 text-surface-200 hover:text-white flex items-center gap-1.5 rounded-lg"
                          title="Download on Pure White Background (Amazon/E-Commerce)"
                        >
                          <Download className="w-3.5 h-3.5 text-surface-400" /> White BG JPG
                        </button>
                        <a
                          href={bgProcessedImage}
                          download={`${files[0].name.replace(/\.[^/.]+$/, '')}_transparent.png`}
                          className="btn-primary text-xs px-4 py-2 flex items-center gap-2 shadow-lg shadow-primary-500/20 rounded-lg"
                        >
                          <Download className="w-4 h-4" /> Download Transparent PNG
                        </a>
                      </>
                    )}
                  </div>
                </div>

                {/* Adjustments Bar */}
                <div className="card p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-surface-800">
                  <div>
                    <div className="flex justify-between text-xs text-surface-400 mb-1">
                      <span>Tolerance (Color Range)</span>
                      <span className="font-mono text-primary-400">{bgTolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="75"
                      value={bgTolerance}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBgTolerance(val);
                        if (rawImageRef.current) {
                          runSmartSegmentation(rawImageRef.current, val, bgEdgeSensitivity, boxSelection);
                        }
                      }}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-surface-400 mb-1">
                      <span>Object Edge Protection Barrier</span>
                      <span className="font-mono text-emerald-400">{bgEdgeSensitivity}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="80"
                      value={bgEdgeSensitivity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBgEdgeSensitivity(val);
                        if (rawImageRef.current) {
                          runSmartSegmentation(rawImageRef.current, bgTolerance, val, boxSelection);
                        }
                      }}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-surface-400 mb-1">
                      <span>Brush Size</span>
                      <span className="font-mono text-amber-400">{bgBrushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="80"
                      value={bgBrushSize}
                      onChange={(e) => setBgBrushSize(Number(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>
                </div>

                {/* Main Interactive Studio Canvas View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: Original with Active Interactive Canvas */}
                  <div className="card p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-surface-300">
                        Interactive Selection Canvas
                      </span>
                      <span className="text-[11px] text-amber-400 font-medium">
                        {bgTool === 'box' && '👉 Drag rectangle over object'}
                        {bgTool === 'wand' && '👉 Click on background to remove'}
                        {bgTool === 'keep' && '👉 Paint over object to protect (green)'}
                        {bgTool === 'erase' && '👉 Paint over background to erase (red)'}
                        {bgTool === 'auto' && '✨ Auto Object Protection Active'}
                      </span>
                    </div>

                    <div className="aspect-[4/3] bg-surface-900 rounded-lg overflow-hidden flex items-center justify-center border border-surface-800 relative select-none">
                      {bgOriginalImage && (
                        <div className="relative max-h-full max-w-full flex items-center justify-center">
                          <img
                            src={bgOriginalImage}
                            alt="Original"
                            className="max-h-[50vh] max-w-full object-contain pointer-events-none block"
                          />
                          <canvas
                            ref={canvasRef}
                            width={rawImageRef.current?.naturalWidth || 600}
                            height={rawImageRef.current?.naturalHeight || 450}
                            onMouseDown={handleCanvasMouseDown}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseUp={handleCanvasMouseUp}
                            onMouseLeave={() => {
                              setMousePos(null);
                              drawOverlay();
                            }}
                            className={`absolute inset-0 w-full h-full ${
                              bgTool === 'wand'
                                ? 'cursor-crosshair'
                                : bgTool === 'box'
                                ? 'cursor-crosshair'
                                : 'cursor-crosshair'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Transparent PNG Result Preview */}
                  <div className="card p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Isolated Object Preview
                      </span>

                      {/* Preview Background Toggles */}
                      <div className="flex items-center gap-1 bg-surface-800 p-0.5 rounded-lg border border-surface-700">
                        <button
                          onClick={() => setBgPreviewMode('checker')}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            bgPreviewMode === 'checker' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-white'
                          }`}
                          title="Checkerboard Transparent"
                        >
                          Transparent
                        </button>
                        <button
                          onClick={() => setBgPreviewMode('white')}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            bgPreviewMode === 'white' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-white'
                          }`}
                          title="Pure White Background (Amazon/E-Commerce)"
                        >
                          White
                        </button>
                        <button
                          onClick={() => setBgPreviewMode('black')}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            bgPreviewMode === 'black' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-white'
                          }`}
                          title="Dark Matte Background"
                        >
                          Dark
                        </button>
                      </div>
                    </div>

                    <div
                      className="aspect-[4/3] rounded-lg overflow-hidden flex items-center justify-center border border-surface-800 transition-colors"
                      style={
                        bgPreviewMode === 'checker'
                          ? {
                              backgroundImage:
                                'linear-gradient(45deg, #1f1f22 25%, transparent 25%), linear-gradient(-45deg, #1f1f22 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1f1f22 75%), linear-gradient(-45deg, transparent 75%, #1f1f22 75%)',
                              backgroundSize: '18px 18px',
                              backgroundColor: '#121214',
                            }
                          : bgPreviewMode === 'white'
                          ? { backgroundColor: '#ffffff' }
                          : { backgroundColor: '#121214' }
                      }
                    >
                      {bgProcessedImage ? (
                        <img
                          src={bgProcessedImage}
                          alt="Processed Transparent PNG"
                          className="max-h-[50vh] max-w-full object-contain select-none"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-surface-500 text-xs">
                          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                          <span>Detecting object boundaries...</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── TAB: PDF TO IMAGE ────────────────────────────────── */}
            {mode === 'pdf-to-image' && (
              <div className="space-y-6">
                <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="text-xs text-surface-400 block mb-1">Target Format</label>
                      <select
                        value={targetFormat}
                        onChange={(e) => {
                          const fmt = e.target.value as any;
                          setTargetFormat(fmt);
                          renderPdfToImages(files[0], fmt, renderScale, quality);
                        }}
                        className="input text-xs py-1.5 px-3"
                      >
                        <option value="png">PNG (Lossless)</option>
                        <option value="jpeg">JPG / JPEG</option>
                        <option value="webp">WEBP (Modern)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-surface-400 block mb-1">Resolution Scale</label>
                      <select
                        value={renderScale}
                        onChange={(e) => {
                          const sc = Number(e.target.value);
                          setRenderScale(sc);
                          renderPdfToImages(files[0], targetFormat, sc, quality);
                        }}
                        className="input text-xs py-1.5 px-3"
                      >
                        <option value={1}>1x (Standard 72 DPI)</option>
                        <option value={1.5}>1.5x (Crisp 108 DPI)</option>
                        <option value={2}>2x (Retina HD 144 DPI)</option>
                        <option value={3}>3x (Ultra HD 216 DPI)</option>
                      </select>
                    </div>
                  </div>

                  {pdfPages.length > 1 && (
                    <button
                      onClick={downloadAllPagesZip}
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-2 shadow-lg shadow-primary-500/20"
                    >
                      <Download className="w-4 h-4" /> Download All Pages ({pdfPages.length}) as ZIP
                    </button>
                  )}
                </div>

                {isProcessing ? (
                  <div className="py-12 text-center text-surface-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
                    <p className="text-xs">Converting PDF pages into images...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {pdfPages.map((p) => (
                      <div
                        key={p.pageNumber}
                        className="card p-3 flex flex-col items-center group relative border-surface-800 hover:border-surface-700 transition-all"
                      >
                        <div className="w-full aspect-[3/4] bg-white rounded overflow-hidden shadow mb-2 flex items-center justify-center">
                          <img
                            src={p.dataUrl}
                            alt={`Page ${p.pageNumber}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="w-full flex items-center justify-between text-xs mt-1">
                          <span className="font-mono text-surface-400 text-[11px]">
                            Page {p.pageNumber}
                          </span>
                          <a
                            href={p.dataUrl}
                            download={`${files[0].name.replace('.pdf', '')}_page_${p.pageNumber}.${
                              targetFormat === 'jpeg' ? 'jpg' : targetFormat
                            }`}
                            className="btn-ghost p-1 text-primary-400 hover:text-white flex items-center gap-1 text-[11px]"
                          >
                            <Download className="w-3.5 h-3.5" /> Save
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: IMAGE TO PDF ────────────────────────────────── */}
            {mode === 'image-to-pdf' && (
              <div className="card p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-surface-400 block mb-1">Page Size</label>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(e.target.value)}
                      className="input"
                    >
                      <option value="A4">A4 (Standard)</option>
                      <option value="Letter">Letter</option>
                      <option value="Fit">Fit to Image Size</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-surface-400 block mb-1">Orientation</label>
                    <select
                      value={orientation}
                      onChange={(e) => setOrientation(e.target.value)}
                      className="input"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                </div>

                {!result && (
                  <button
                    onClick={handleStandardConvert}
                    disabled={isProcessing}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Converting to PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" /> Convert to PDF
                      </>
                    )}
                  </button>
                )}

                {result && (
                  <div className="card text-center p-6 border-green-500/20 bg-green-500/5 mt-4">
                    <h3 className="text-base font-semibold text-white mb-2">Conversion Complete!</h3>
                    <a href={result.path} download className="btn-primary inline-flex items-center gap-2 text-xs">
                      <Download className="w-4 h-4" /> Download PDF
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* ─── TAB: UNIVERSAL IMAGE CONVERTER ──────────────────── */}
            {mode === 'image-convert' && (
              <div className="space-y-6">
                {/* 1. Quick 1-Click Conversion Presets */}
                <div className="card p-5 border-surface-800 bg-surface-900/60">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary-400" /> Popular 1-Click Presets
                    </span>
                    <span className="text-[11px] text-surface-400">Click to auto-configure</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '📱 HEIC ➔ JPG', format: 'jpg', q: 90, hint: 'iPhone to Universal' },
                      { label: '⚡ JPG ➔ PNG', format: 'png', q: 95, hint: 'Photo to Lossless' },
                      { label: '🖼️ PNG ➔ JPG', format: 'jpg', q: 88, hint: 'Transparent to Compact' },
                      { label: '🍏 ANY ➔ HEIC', format: 'heic', q: 85, hint: 'High-Efficiency' },
                      { label: '🌐 ANY ➔ WEBP', format: 'webp', q: 85, hint: 'Ultra-Fast Web' },
                      { label: '🚀 ANY ➔ AVIF', format: 'avif', q: 85, hint: 'Next-Gen HDR' },
                      { label: '🖨️ ANY ➔ TIFF', format: 'tiff', q: 100, hint: 'Studio Print' },
                    ].map((preset) => {
                      const isActive = imageTargetFormat === preset.format;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setImageTargetFormat(preset.format as any);
                            setQuality(preset.q);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 border ${
                            isActive
                              ? 'bg-primary-500 text-white border-primary-400 shadow-md shadow-primary-500/25'
                              : 'bg-surface-800/80 text-surface-300 border-surface-700/80 hover:bg-surface-700 hover:text-white'
                          }`}
                        >
                          <span>{preset.label}</span>
                          <span className="text-[10px] opacity-70 font-normal">({preset.hint})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Target Format Grid */}
                <div className="card p-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-white uppercase tracking-wider block mb-3">
                      Select Target Output Format
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {[
                        { id: 'jpg', name: 'JPG / JPEG', badge: 'Universal', desc: 'Compressed photos, universal compatibility' },
                        { id: 'png', name: 'PNG', badge: 'Lossless', desc: 'Preserves sharp edges & transparency' },
                        { id: 'heic', name: 'HEIC / HEIF', badge: 'Apple Tech', desc: 'High-efficiency Apple iPhone photo standard' },
                        { id: 'webp', name: 'WEBP', badge: 'Modern Web', desc: 'Ultra-compact file size with rich colors' },
                        { id: 'avif', name: 'AVIF', badge: 'Next-Gen', desc: 'Superior compression & HDR dynamic range' },
                        { id: 'tiff', name: 'TIFF', badge: 'Print Master', desc: 'Uncompressed fidelity for publishing' },
                        { id: 'gif', name: 'GIF', badge: 'Graphic', desc: 'Standard web graphics and small animations' },
                      ].map((fmt) => {
                        const isSelected = imageTargetFormat === fmt.id;
                        return (
                          <div
                            key={fmt.id}
                            onClick={() => setImageTargetFormat(fmt.id as any)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-28 ${
                              isSelected
                                ? 'bg-primary-500/15 border-primary-500 ring-1 ring-primary-500 shadow-lg shadow-primary-500/10'
                                : 'bg-surface-800/60 border-surface-700 hover:border-surface-600 hover:bg-surface-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-white">{fmt.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                                  isSelected ? 'bg-primary-500 text-white' : 'bg-surface-700 text-surface-400'
                                }`}
                              >
                                {fmt.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-surface-400 leading-tight mt-1">
                              {fmt.desc}
                            </p>
                            <div className="flex items-center justify-end text-xs">
                              {isSelected ? (
                                <Check className="w-3.5 h-3.5 text-primary-400 font-bold" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-surface-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quality Slider */}
                  <div className="pt-2 border-t border-surface-800">
                    <div className="flex items-center justify-between text-xs text-surface-300 mb-2">
                      <span className="font-semibold text-white">Quality & Compression</span>
                      <span className="font-mono text-primary-400 font-bold">
                        {quality}% — {quality >= 90 ? 'Studio Ultra HD' : quality >= 80 ? 'High Fidelity' : 'Standard Web'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="100"
                      value={quality}
                      onChange={(e) => setQuality(Number(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                    <div className="flex justify-between text-[10px] text-surface-500 mt-1">
                      <span>50% (Max Compression)</span>
                      <span>85% (Recommended)</span>
                      <span>100% (Maximum Quality)</span>
                    </div>
                  </div>

                  {/* 3. Input Queue & Files Preview */}
                  <div className="pt-3 border-t border-surface-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-surface-300 uppercase tracking-wider">
                        Files to Convert ({files.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium"
                      >
                        <Upload className="w-3 h-3" /> Add more images
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {files.map((file, idx) => {
                        const ext = file.name.split('.').pop()?.toUpperCase() || 'IMG';
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-surface-800/80 border border-surface-700/80 flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5 truncate mr-3">
                              <span className="px-2 py-0.5 rounded bg-surface-900 border border-surface-700 font-mono text-[10px] text-surface-300 font-bold">
                                {ext}
                              </span>
                              <span className="truncate text-white font-medium">{file.name}</span>
                              <span className="text-[11px] text-surface-500 font-mono shrink-0">
                                ({formatBytes(file.size)})
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-surface-500">➔</span>
                              <span className="px-2 py-0.5 rounded bg-primary-500/20 text-primary-400 border border-primary-500/30 font-mono text-[10px] font-bold">
                                {imageTargetFormat.toUpperCase()}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = files.filter((_, i) => i !== idx);
                                  setFiles(updated);
                                  if (updated.length === 0) setResult(null);
                                }}
                                className="text-surface-500 hover:text-red-400 p-1"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Convert Action Button */}
                  {!result && (
                    <button
                      onClick={handleStandardConvert}
                      disabled={isProcessing || files.length === 0}
                      className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-primary-500/25 mt-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> Converting {files.length} Image{files.length > 1 ? 's' : ''}...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" /> Convert {files.length} Image{files.length > 1 ? 's' : ''} to {imageTargetFormat.toUpperCase()}
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* 5. Results Display */}
                {result && (
                  <div className="card p-6 border-green-500/30 bg-green-500/5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-green-500/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Conversion Complete!
                          </h3>
                          <p className="text-xs text-green-300">
                            {result.total ? `${result.total} images successfully converted to ${imageTargetFormat.toUpperCase()}` : `Image converted to ${imageTargetFormat.toUpperCase()}`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setResult(null);
                          setFiles([]);
                        }}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Convert New Files
                      </button>
                    </div>

                    {/* Batch ZIP Download Button */}
                    {result.zipPath && (
                      <div className="p-4 rounded-xl bg-surface-900 border border-surface-700 flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold text-white text-xs">Batch Archive Ready</div>
                          <div className="text-[11px] text-surface-400 mt-0.5">
                            All {result.total} images packaged into a single high-speed ZIP
                          </div>
                        </div>
                        <a
                          href={result.zipPath}
                          download={result.zipFilename || `batch_converted_${imageTargetFormat}.zip`}
                          className="btn-primary text-xs px-4 py-2 flex items-center gap-2 shadow-lg shadow-primary-500/20 shrink-0"
                        >
                          <Download className="w-4 h-4" /> Download ZIP Archive
                        </a>
                      </div>
                    )}

                    {/* Single Image Result */}
                    {!result.converted && result.path && (
                      <div className="p-4 rounded-xl bg-surface-900 border border-surface-700 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 truncate">
                          <img
                            src={result.path}
                            alt="Converted preview"
                            className="w-14 h-14 rounded-lg object-contain bg-surface-950 border border-surface-800 shrink-0"
                          />
                          <div className="truncate">
                            <div className="font-medium text-white text-xs truncate">
                              {result.filename}
                            </div>
                            <div className="text-[11px] text-surface-400 font-mono mt-0.5">
                              {result.width} × {result.height} px • {formatBytes(result.size)} • {result.format?.toUpperCase()}
                            </div>
                          </div>
                        </div>
                        <a
                          href={result.path}
                          download={result.filename}
                          className="btn-primary text-xs px-4 py-2 flex items-center gap-2 shrink-0 shadow-lg shadow-primary-500/20"
                        >
                          <Download className="w-4 h-4" /> Save {imageTargetFormat.toUpperCase()}
                        </a>
                      </div>
                    )}

                    {/* Batch Items Grid */}
                    {result.converted && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {result.converted.map((item: any, i: number) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-surface-900 border border-surface-700 flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <img
                                src={item.path}
                                alt={item.displayName}
                                className="w-10 h-10 rounded-lg object-contain bg-surface-950 border border-surface-800 shrink-0"
                              />
                              <div className="truncate">
                                <div className="font-medium text-white text-xs truncate">
                                  {item.displayName}
                                </div>
                                <div className="text-[10px] text-surface-400 font-mono">
                                  {item.width} × {item.height} • {formatBytes(item.size)}
                                </div>
                              </div>
                            </div>
                            <a
                              href={item.path}
                              download={item.displayName}
                              className="btn-secondary text-[11px] py-1.5 flex items-center justify-center gap-1.5 w-full text-surface-200 hover:text-white"
                            >
                              <Download className="w-3.5 h-3.5" /> Save
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mt-4">
                {error}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
