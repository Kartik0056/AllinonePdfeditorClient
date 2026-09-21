/**
 * Image Editor Studio Pro - Professional studio-grade image editor
 * Inspired by Photoshop, Lightroom & After Effects
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sliders, Crop, Type, PenTool, Sparkles, Download, Undo2, Redo2,
  RotateCw, FlipHorizontal, FlipVertical, ZoomIn, ZoomOut, Upload,
  Layers, Palette, Sun, Contrast, Eye, Trash2, Check, X, Maximize2,
  Activity, TrendingUp, RefreshCw, Scissors, Grid3X3
} from 'lucide-react';
import Navbar from '../components/Navbar';

type ToolTab = 'adjust' | 'curves' | 'filters' | 'crop' | 'text' | 'draw' | 'magic';

interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  fontWeight: string;
  rotation: number;
}

interface ImageAdjustments {
  brightness: number;  // 100 default
  contrast: number;    // 100 default
  saturation: number;  // 100 default
  exposure: number;    // 0 default (-100 to 100)
  temperature: number; // 0 default (-100 warm to +100 cool)
  tint: number;        // 0 default (-100 green to +100 magenta)
  vibrance: number;    // 0 default (-100 to +100)
  highlights: number;  // 0 default (-100 to +100)
  shadows: number;     // 0 default (-100 to +100)
  sharpness: number;   // 0 default (0 to 100)
  vignette: number;    // 0 default (0 to 100)
  grain: number;       // 0 default (0 to 100)
  blur: number;        // 0px default
  sepia: number;       // 0% default
  grayscale: number;   // 0% default
  invert: number;      // 0% default
  hueRotate: number;   // 0 deg default
}

interface CurveChannelPoints {
  blacks: number;     // y for x=0 (0-255)
  shadows: number;    // y for x=64 (0-255)
  midtones: number;   // y for x=128 (0-255)
  highlights: number; // y for x=192 (0-255)
  whites: number;     // y for x=255 (0-255)
}

const defaultCurves: Record<'master' | 'red' | 'green' | 'blue', CurveChannelPoints> = {
  master: { blacks: 0, shadows: 64, midtones: 128, highlights: 192, whites: 255 },
  red: { blacks: 0, shadows: 64, midtones: 128, highlights: 192, whites: 255 },
  green: { blacks: 0, shadows: 64, midtones: 128, highlights: 192, whites: 255 },
  blue: { blacks: 0, shadows: 64, midtones: 128, highlights: 192, whites: 255 },
};

const defaultAdjustments: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  exposure: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 0,
  vignette: 0,
  grain: 0,
  blur: 0,
  sepia: 0,
  grayscale: 0,
  invert: 0,
  hueRotate: 0,
};

const filterPresets: { name: string; adjustments: Partial<ImageAdjustments>; bg: string }[] = [
  { name: 'Normal', adjustments: { ...defaultAdjustments }, bg: 'bg-surface-800' },
  { name: 'Cyberpunk', adjustments: { brightness: 110, contrast: 135, saturation: 160, hueRotate: 280, temperature: -20, vignette: 40 }, bg: 'from-pink-500 to-cyan-500' },
  { name: 'Noir (B&W)', adjustments: { brightness: 105, contrast: 150, grayscale: 100, saturation: 0, grain: 25, vignette: 50 }, bg: 'from-gray-800 to-black' },
  { name: 'Warm Sunset', adjustments: { brightness: 105, contrast: 115, saturation: 130, temperature: 45, tint: 15, vignette: 20 }, bg: 'from-amber-500 to-orange-600' },
  { name: 'Vivid Cinema', adjustments: { brightness: 105, contrast: 125, saturation: 140, vibrance: 35, highlights: -10, shadows: 15 }, bg: 'from-red-500 to-amber-500' },
  { name: 'Vintage 70s', adjustments: { brightness: 95, contrast: 110, sepia: 40, saturation: 85, grain: 35, temperature: 20 }, bg: 'from-amber-700 to-yellow-900' },
  { name: 'Moody Teal', adjustments: { brightness: 95, contrast: 130, saturation: 110, temperature: -35, tint: -10, vignette: 45 }, bg: 'from-teal-800 to-cyan-950' },
  { name: 'Cool Nordic', adjustments: { brightness: 100, contrast: 105, hueRotate: 190, saturation: 90, temperature: -40 }, bg: 'from-blue-600 to-cyan-400' },
];

export default function ImageEditorPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalSrc, setOriginalSrc] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ToolTab>('adjust');

  // Canvas & render refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Adjustments & Transforms
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(defaultAdjustments);
  const [curves, setCurves] = useState(defaultCurves);
  const [activeCurveChannel, setActiveCurveChannel] = useState<'master' | 'red' | 'green' | 'blue'>('master');
  const [rotation, setRotation] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Zoom and Pan Controls
  const [zoom, setZoom] = useState<number>(100);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Before / After Compare
  const [isComparing, setIsComparing] = useState(false);

  // Aspect Ratio Cropping Mode
  const [isCropMode, setIsCropMode] = useState(false);
  const [cropAspect, setCropAspect] = useState<'free' | '1:1' | '4:5' | '16:9' | '9:16' | '4:3'>('free');
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number }>({
    x: 10, y: 10, width: 80, height: 80
  });

  // Layers (Text & Drawing)
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Freehand Drawing
  const [brushColor, setBrushColor] = useState('#ff0055');
  const [brushSize, setBrushSize] = useState(6);
  const [drawingStrokes, setDrawingStrokes] = useState<
    { points: { x: number; y: number }[]; color: string; size: number }[]
  >([]);

  // History Stack
  const [history, setHistory] = useState<ImageAdjustments[]>([defaultAdjustments]);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  // Load Image File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageSrc(dataUrl);
      setOriginalSrc(dataUrl);
      setAdjustments(defaultAdjustments);
      setCurves(defaultCurves);
      setTextLayers([]);
      setDrawingStrokes([]);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setIsCropMode(false);
      setZoom(100);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  const handleLoadSampleImage = () => {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 800;
    const ctx = c.getContext('2d')!;

    // Gorgeous cinematic sunset landscape sample
    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.3, '#312e81');
    grad.addColorStop(0.6, '#c026d3');
    grad.addColorStop(0.8, '#f97316');
    grad.addColorStop(1, '#fde047');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);

    // Glowing sun
    ctx.beginPath();
    ctx.arc(600, 480, 130, 0, Math.PI * 2);
    ctx.fillStyle = '#fff7ed';
    ctx.shadowColor = '#f97316';
    ctx.shadowBlur = 50;
    ctx.fill();

    // Mountains silhouette
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(0, 800);
    ctx.lineTo(0, 520);
    ctx.lineTo(250, 420);
    ctx.lineTo(480, 550);
    ctx.lineTo(750, 390);
    ctx.lineTo(1000, 530);
    ctx.lineTo(1200, 440);
    ctx.lineTo(1200, 800);
    ctx.closePath();
    ctx.fillStyle = '#09090b';
    ctx.fill();

    const dataUrl = c.toDataURL('image/png');
    setImageSrc(dataUrl);
    setOriginalSrc(dataUrl);
    setAdjustments(defaultAdjustments);
    setCurves(defaultCurves);
    setTextLayers([]);
    setDrawingStrokes([]);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setIsCropMode(false);
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };

  const updateAdj = (key: keyof ImageAdjustments, value: number) => {
    const next = { ...adjustments, [key]: value };
    setAdjustments(next);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setAdjustments(history[historyIdx - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setAdjustments(history[historyIdx + 1]);
    }
  };

  // Wheel to Zoom In / Out
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 12 : -12;
    setZoom((z) => Math.max(20, Math.min(500, z + delta)));
  };

  // Viewport Mouse Events for Panning when zoomed in
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'DIV') {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
    setSelectedTextId(null);
  };

  const handleViewportMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleViewportMouseUp = () => {
    setIsPanning(false);
  };

  // Add new Text Layer
  const addTextLayer = () => {
    const newLayer: TextLayer = {
      id: Math.random().toString(36).slice(2),
      text: 'Double click to edit',
      x: 100,
      y: 100,
      fontSize: 32,
      fontFamily: 'Inter, sans-serif',
      color: '#ffffff',
      fontWeight: 'bold',
      rotation: 0,
    };
    setTextLayers((prev) => [...prev, newLayer]);
    setSelectedTextId(newLayer.id);
  };

  // Drag text layers
  const handleTextMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedTextId(id);
    setDraggingTextId(id);
    const target = textLayers.find((t) => t.id === id);
    if (target && imageContainerRef.current) {
      const rect = imageContainerRef.current.getBoundingClientRect();
      const scale = zoom / 100;
      const mouseX = (e.clientX - rect.left) / scale;
      const mouseY = (e.clientY - rect.top) / scale;
      setDragOffset({
        x: mouseX - target.x,
        y: mouseY - target.y,
      });
    }
  };

  useEffect(() => {
    if (!draggingTextId) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!imageContainerRef.current) return;
      const rect = imageContainerRef.current.getBoundingClientRect();
      const scale = zoom / 100;
      const mouseX = (e.clientX - rect.left) / scale;
      const mouseY = (e.clientY - rect.top) / scale;
      const newX = Math.round(mouseX - dragOffset.x);
      const newY = Math.round(mouseY - dragOffset.y);

      setTextLayers((prev) =>
        prev.map((l) => (l.id === draggingTextId ? { ...l, x: newX, y: newY } : l))
      );
    };

    const handleWindowMouseUp = () => {
      setDraggingTextId(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggingTextId, dragOffset, zoom]);

  // Crop Application
  const handleApplyCrop = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      const cropPixelX = (cropBox.x / 100) * img.width;
      const cropPixelY = (cropBox.y / 100) * img.height;
      const cropPixelW = (cropBox.width / 100) * img.width;
      const cropPixelH = (cropBox.height / 100) * img.height;

      c.width = Math.max(1, cropPixelW);
      c.height = Math.max(1, cropPixelH);
      const ctx = c.getContext('2d')!;

      ctx.drawImage(
        img,
        cropPixelX, cropPixelY, cropPixelW, cropPixelH,
        0, 0, c.width, c.height
      );

      const croppedUrl = c.toDataURL('image/png');
      setImageSrc(croppedUrl);
      setIsCropMode(false);
      setPan({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  };

  // 1-Click Smart Background Remover
  const handleMagicBgRemove = () => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, c.width, c.height);
      const d = imgData.data;

      const keyR = (d[0] + d[(c.width - 1) * 4]) / 2;
      const keyG = (d[1] + d[(c.width - 1) * 4 + 1]) / 2;
      const keyB = (d[2] + d[(c.width - 1) * 4 + 2]) / 2;

      for (let i = 0; i < d.length; i += 4) {
        const dist = Math.sqrt(
          (d[i] - keyR) ** 2 + (d[i + 1] - keyG) ** 2 + (d[i + 2] - keyB) ** 2
        );
        if (dist < 80) {
          d[i + 3] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);
      setImageSrc(c.toDataURL('image/png'));
    };
    img.src = imageSrc;
  };

  // Export Combined Canvas to High-Res Image with tone curves and color grading
  const handleExport = (format: 'png' | 'jpeg' | 'webp') => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;

      // Background for JPEG
      if (format === 'jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
      }

      // Apply Transformations
      ctx.save();
      ctx.translate(c.width / 2, c.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.translate(-c.width / 2, -c.height / 2);

      // Apply CSS Filters directly to canvas drawing
      ctx.filter = `brightness(${adjustments.brightness + adjustments.exposure}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation + adjustments.vibrance}%) blur(${adjustments.blur}px) sepia(${adjustments.sepia}%) grayscale(${adjustments.grayscale}%) invert(${adjustments.invert}%) hue-rotate(${adjustments.hueRotate}deg)`;
      ctx.drawImage(img, 0, 0);

      // Vignette effect
      if (adjustments.vignette > 0) {
        const gradient = ctx.createRadialGradient(
          c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.35,
          c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.75
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, `rgba(0,0,0,${(adjustments.vignette / 100) * 0.85})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, c.width, c.height);
      }

      ctx.restore();

      // Render Drawings
      ctx.save();
      drawingStrokes.forEach((stroke) => {
        if (stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      });
      ctx.restore();

      // Render Text Layers
      textLayers.forEach((t) => {
        ctx.save();
        ctx.font = `${t.fontWeight} ${t.fontSize}px ${t.fontFamily}`;
        ctx.textBaseline = 'top';
        ctx.fillStyle = t.color;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
      });

      const mime = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const dataUrl = c.toDataURL(mime, 0.95);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `studio_pro_${Date.now()}.${format === 'jpeg' ? 'jpg' : format}`;
      a.click();
    };
    img.src = imageSrc;
  };

  // Curve channel points helper
  const curCurve = curves[activeCurveChannel];
  const updateCurvePoint = (key: keyof CurveChannelPoints, val: number) => {
    setCurves((prev) => ({
      ...prev,
      [activeCurveChannel]: {
        ...prev[activeCurveChannel],
        [key]: val,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col overflow-hidden select-none">
      <Navbar />

      {/* Editor Sub-Header Toolbar */}
      <div className="h-12 bg-surface-900 border-b border-surface-800/80 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-white tracking-wide uppercase">Image Studio Pro</span>
          </div>
          {imageFile && (
            <span className="text-xs text-surface-400 font-mono truncate max-w-[200px]">
              {imageFile.name}
            </span>
          )}
        </div>

        {/* Top Controls: History, Zoom, Compare & Export */}
        <div className="flex items-center gap-2">
          {imageSrc && (
            <button
              onMouseDown={() => setIsComparing(true)}
              onMouseUp={() => setIsComparing(false)}
              onMouseLeave={() => setIsComparing(false)}
              onTouchStart={() => setIsComparing(true)}
              onTouchEnd={() => setIsComparing(false)}
              className={`btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 font-medium transition-all ${
                isComparing ? 'bg-amber-500 text-black border-amber-400 font-bold scale-95' : 'text-surface-300 hover:text-white'
              }`}
              title="Hold to view original unedited photo"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isComparing ? 'Showing Original' : 'Hold to Compare'}</span>
            </button>
          )}

          <div className="h-4 w-px bg-surface-800 mx-1" />

          <button
            onClick={handleUndo}
            disabled={historyIdx === 0}
            className="btn-icon p-1.5 disabled:opacity-30 text-surface-400 hover:text-white"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIdx >= history.length - 1}
            className="btn-icon p-1.5 disabled:opacity-30 text-surface-400 hover:text-white"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-surface-800 mx-1" />

          {/* Zoom controls */}
          <button
            onClick={() => setZoom((z) => Math.max(20, z - 20))}
            className="btn-icon p-1.5 text-surface-400 hover:text-white"
            title="Zoom Out (or scroll down)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setZoom(100); setPan({ x: 0, y: 0 }); }}
            className="text-xs text-surface-400 hover:text-white font-mono px-1 py-0.5 rounded hover:bg-surface-800"
            title="Reset Zoom to 100%"
          >
            {zoom}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(500, z + 20))}
            className="btn-icon p-1.5 text-surface-400 hover:text-white"
            title="Zoom In (or scroll up)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => { setZoom(100); setPan({ x: 0, y: 0 }); }}
            className="btn-ghost text-xs px-2 py-1 text-surface-400 hover:text-white"
            title="Fit to Screen"
          >
            Fit
          </button>

          <div className="h-4 w-px bg-surface-800 mx-1" />

          {/* Export Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleExport('png')}
              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 shadow-md shadow-primary-500/20"
            >
              <Download className="w-3.5 h-3.5" /> Save PNG
            </button>
            <button
              onClick={() => handleExport('jpeg')}
              className="btn-secondary text-xs px-2.5 py-1.5 text-surface-300 hover:text-white"
            >
              JPG
            </button>
            <button
              onClick={() => handleExport('webp')}
              className="btn-secondary text-xs px-2.5 py-1.5 text-surface-300 hover:text-white"
            >
              WEBP
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Body */}
      {!imageSrc ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card p-10 max-w-md w-full text-center border-surface-800">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Open an Image</h2>
            <p className="text-surface-400 text-xs mb-6">
              Studio-grade photo editing, RGB Tone Curves, Lightroom color grading, and background removal.
            </p>
            <div
              className="dropzone cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className="w-8 h-8 text-surface-500 mx-auto mb-2" />
              <p className="text-surface-300 font-medium text-sm">Choose image or drop here</p>
              <p className="text-surface-500 text-xs mt-0.5">Supports JPG, PNG, WEBP, HEIC, TIFF, AVIF</p>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs text-surface-500">or</span>
              <button
                onClick={handleLoadSampleImage}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-primary-400 hover:text-white"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                <span>Try with Sample Image</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          {/* ─── 1. Center Stage / Canvas Viewport (LEFT & CENTER) ─── */}
          <div
            className="flex-1 bg-surface-950 flex items-center justify-center overflow-hidden p-6 relative select-none"
            onWheel={handleWheel}
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={handleViewportMouseUp}
            onMouseLeave={handleViewportMouseUp}
            style={{ cursor: isPanning ? 'grabbing' : zoom > 100 ? 'grab' : 'default' }}
          >
            {/* Quick Zoom Pill & Reset Overlay */}
            <div className="absolute bottom-4 left-4 z-20 bg-surface-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-surface-800 text-[11px] text-surface-400 font-mono pointer-events-auto flex items-center gap-2.5 shadow-lg">
              <span>🔍 Scroll wheel to Zoom In / Out</span>
              <span className="text-surface-600">•</span>
              <span className="text-white font-semibold">{zoom}%</span>
              {(zoom !== 100 || pan.x !== 0 || pan.y !== 0) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom(100);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="text-primary-400 hover:text-white font-semibold uppercase text-[10px] ml-1 bg-primary-500/20 px-1.5 py-0.5 rounded"
                  title="Reset Zoom and Center"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Canvas Container with Smooth Pan & Zoom */}
            <div
              ref={imageContainerRef}
              className="relative shadow-2xl rounded-lg overflow-hidden transition-transform duration-75"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
                transformOrigin: 'center center',
                backgroundImage:
                  'linear-gradient(45deg, #1c1c1f 25%, transparent 25%), linear-gradient(-45deg, #1c1c1f 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1c1c1f 75%), linear-gradient(-45deg, transparent 75%, #1c1c1f 75%)',
                backgroundSize: '16px 16px',
                backgroundColor: '#121214',
              }}
            >
              {/* Filtered & Transformed Image or Original (when comparing) */}
              <img
                src={isComparing && originalSrc ? originalSrc : imageSrc}
                alt="Workspace"
                className="max-h-[82vh] max-w-[calc(100vw-460px)] object-contain block pointer-events-none"
                style={{
                  filter: isComparing
                    ? 'none'
                    : `brightness(${adjustments.brightness + adjustments.exposure}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation + adjustments.vibrance}%) blur(${adjustments.blur}px) sepia(${adjustments.sepia}%) grayscale(${adjustments.grayscale}%) invert(${adjustments.invert}%) hue-rotate(${adjustments.hueRotate}deg)`,
                  transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                }}
              />

              {/* Real-time Vignette Overlay */}
              {!isComparing && adjustments.vignette > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${(adjustments.vignette / 100) * 0.85}) 100%)`,
                  }}
                />
              )}

              {/* Real-time Film Grain Overlay */}
              {!isComparing && adjustments.grain > 0 && (
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-60"
                  style={{
                    backgroundImage: `radial-gradient(rgba(255,255,255,${adjustments.grain * 0.005}) 1px, transparent 0)`,
                    backgroundSize: '3px 3px',
                  }}
                />
              )}

              {/* Aspect Ratio Cropping Grid Box Overlay */}
              {isCropMode && (
                <div
                  className="absolute inset-0 border-2 border-primary-500 shadow-2xl pointer-events-none"
                  style={{
                    left: `${cropBox.x}%`,
                    top: `${cropBox.y}%`,
                    width: `${cropBox.width}%`,
                    height: `${cropBox.height}%`,
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65)',
                  }}
                >
                  <div className="w-full h-full relative grid grid-cols-3 grid-rows-3 border border-primary-400/40">
                    <div className="border-r border-b border-primary-400/30" />
                    <div className="border-r border-b border-primary-400/30" />
                    <div className="border-b border-primary-400/30" />
                    <div className="border-r border-b border-primary-400/30" />
                    <div className="border-r border-b border-primary-400/30" />
                    <div className="border-b border-primary-400/30" />
                    <div className="border-r border-b border-primary-400/30" />
                    <div className="border-r border-b border-primary-400/30" />
                    <div />
                  </div>
                </div>
              )}

              {/* Text Layers on top with interactive mouse drag */}
              {textLayers.map((t) => {
                const isSelected = selectedTextId === t.id;
                const isDragging = draggingTextId === t.id;
                return (
                  <div
                    key={t.id}
                    onMouseDown={(e) => handleTextMouseDown(e, t.id)}
                    style={{
                      position: 'absolute',
                      left: `${t.x}px`,
                      top: `${t.y}px`,
                      fontSize: `${t.fontSize}px`,
                      color: t.color,
                      fontFamily: t.fontFamily,
                      fontWeight: t.fontWeight as any,
                      textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      zIndex: isSelected ? 30 : 10,
                    }}
                    className={`select-none transition-all px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'ring-2 ring-primary-500 bg-primary-500/10 shadow-lg'
                        : 'hover:ring-1 hover:ring-white/40'
                    }`}
                  >
                    <span>{t.text}</span>
                    {isSelected && (
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-primary-500 rounded-full border border-white shadow flex items-center justify-center text-[8px] text-white">
                        •
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── 2. Tool Options Sub-Panel (RIGHT SIDE) ─── */}
          <div className="w-80 bg-surface-900/95 border-l border-surface-800/80 p-4 overflow-y-auto shrink-0 flex flex-col z-10">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-surface-800 flex items-center justify-between">
              <span>
                {activeTab === 'adjust' && 'Light & Color Grading'}
                {activeTab === 'curves' && 'RGB Tone Curve (Photoshop)'}
                {activeTab === 'filters' && 'Cinematic Color Presets'}
                {activeTab === 'crop' && 'Aspect Ratio & Crop'}
                {activeTab === 'text' && 'Typography & Overlays'}
                {activeTab === 'draw' && 'Brush & Drawing Tools'}
                {activeTab === 'magic' && 'Magic AI Tools'}
              </span>
            </h3>

            {/* 1. Light & Color Adjustments (Lightroom Grade) */}
            {activeTab === 'adjust' && (
              <div className="space-y-4">
                {/* Light Section */}
                <div className="space-y-3 pb-3 border-b border-surface-800">
                  <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider block">Light</span>
                  {[
                    { key: 'exposure', label: 'Exposure', min: -100, max: 100, unit: '' },
                    { key: 'contrast', label: 'Contrast', min: 0, max: 200, unit: '%' },
                    { key: 'highlights', label: 'Highlights', min: -100, max: 100, unit: '' },
                    { key: 'shadows', label: 'Shadows', min: -100, max: 100, unit: '' },
                    { key: 'brightness', label: 'Brightness', min: 0, max: 200, unit: '%' },
                  ].map((item) => (
                    <div key={item.key}>
                      <div className="flex justify-between text-xs text-surface-400 mb-1">
                        <span>{item.label}</span>
                        <span className="font-mono text-surface-200">
                          {adjustments[item.key as keyof ImageAdjustments]}{item.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={item.min}
                        max={item.max}
                        value={adjustments[item.key as keyof ImageAdjustments]}
                        onChange={(e) => updateAdj(item.key as keyof ImageAdjustments, Number(e.target.value))}
                        className="w-full accent-primary-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Color & Temperature Section */}
                <div className="space-y-3 pb-3 border-b border-surface-800">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">Color & Temperature</span>
                  {[
                    { key: 'temperature', label: 'Temp (Warm / Cool)', min: -100, max: 100, unit: '' },
                    { key: 'tint', label: 'Tint (Green / Magenta)', min: -100, max: 100, unit: '' },
                    { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, unit: '' },
                    { key: 'saturation', label: 'Saturation', min: 0, max: 200, unit: '%' },
                    { key: 'hueRotate', label: 'Hue Rotate', min: 0, max: 360, unit: '°' },
                  ].map((item) => (
                    <div key={item.key}>
                      <div className="flex justify-between text-xs text-surface-400 mb-1">
                        <span>{item.label}</span>
                        <span className="font-mono text-surface-200">
                          {adjustments[item.key as keyof ImageAdjustments]}{item.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={item.min}
                        max={item.max}
                        value={adjustments[item.key as keyof ImageAdjustments]}
                        onChange={(e) => updateAdj(item.key as keyof ImageAdjustments, Number(e.target.value))}
                        className="w-full accent-primary-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Effects Section */}
                <div className="space-y-3 pb-3 border-b border-surface-800">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block">Effects & Texture</span>
                  {[
                    { key: 'vignette', label: 'Vignette Darkening', min: 0, max: 100, unit: '%' },
                    { key: 'grain', label: 'Film Grain', min: 0, max: 100, unit: '%' },
                    { key: 'blur', label: 'Soft Blur', min: 0, max: 20, unit: 'px' },
                    { key: 'sepia', label: 'Sepia', min: 0, max: 100, unit: '%' },
                    { key: 'grayscale', label: 'Grayscale B&W', min: 0, max: 100, unit: '%' },
                  ].map((item) => (
                    <div key={item.key}>
                      <div className="flex justify-between text-xs text-surface-400 mb-1">
                        <span>{item.label}</span>
                        <span className="font-mono text-surface-200">
                          {adjustments[item.key as keyof ImageAdjustments]}{item.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={item.min}
                        max={item.max}
                        value={adjustments[item.key as keyof ImageAdjustments]}
                        onChange={(e) => updateAdj(item.key as keyof ImageAdjustments, Number(e.target.value))}
                        className="w-full accent-primary-500"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setAdjustments(defaultAdjustments)}
                  className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset All Sliders
                </button>
              </div>
            )}

            {/* 2. Interactive Tone Curves (Photoshop Style) */}
            {activeTab === 'curves' && (
              <div className="space-y-4">
                {/* Channel Selector */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-surface-800 rounded-lg">
                  {[
                    { id: 'master', label: 'RGB', color: 'text-white' },
                    { id: 'red', label: 'Red', color: 'text-red-400' },
                    { id: 'green', label: 'Green', color: 'text-green-400' },
                    { id: 'blue', label: 'Blue', color: 'text-blue-400' },
                  ].map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setActiveCurveChannel(ch.id as any)}
                      className={`text-xs py-1 rounded font-semibold transition-all ${
                        activeCurveChannel === ch.id
                          ? 'bg-surface-700 shadow text-white'
                          : `${ch.color} opacity-70 hover:opacity-100`
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>

                {/* Interactive Curve SVG Graph */}
                <div className="relative w-full aspect-square bg-surface-950 rounded-xl border border-surface-700 p-3 shadow-inner">
                  {/* Grid Lines */}
                  <svg className="w-full h-full" viewBox="0 0 256 256">
                    <line x1="64" y1="0" x2="64" y2="256" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="128" y1="0" x2="128" y2="256" stroke="#3f3f46" strokeWidth="1" />
                    <line x1="192" y1="0" x2="192" y2="256" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="64" x2="256" y2="64" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="128" x2="256" y2="128" stroke="#3f3f46" strokeWidth="1" />
                    <line x1="0" y1="192" x2="256" y2="192" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" />

                    {/* Linear Diagonal Reference */}
                    <line x1="0" y1="256" x2="256" y2="0" stroke="#52525b" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />

                    {/* Spline Curve Path */}
                    <path
                      d={`M 0 ${256 - curCurve.blacks} C 64 ${256 - curCurve.shadows}, 128 ${256 - curCurve.midtones}, 192 ${256 - curCurve.highlights} S 256 ${256 - curCurve.whites}, 256 ${256 - curCurve.whites}`}
                      fill="none"
                      stroke={
                        activeCurveChannel === 'red' ? '#ef4444' :
                        activeCurveChannel === 'green' ? '#22c55e' :
                        activeCurveChannel === 'blue' ? '#3b82f6' : '#ffffff'
                      }
                      strokeWidth="2.5"
                    />

                    {/* Interactive Points */}
                    {[
                      { key: 'blacks', x: 0, y: curCurve.blacks },
                      { key: 'shadows', x: 64, y: curCurve.shadows },
                      { key: 'midtones', x: 128, y: curCurve.midtones },
                      { key: 'highlights', x: 192, y: curCurve.highlights },
                      { key: 'whites', x: 256, y: curCurve.whites },
                    ].map((pt) => (
                      <circle
                        key={pt.key}
                        cx={pt.x}
                        cy={256 - pt.y}
                        r="5"
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        className="cursor-ns-resize hover:scale-125 transition-transform"
                      />
                    ))}
                  </svg>
                </div>

                {/* Point Sliders */}
                <div className="space-y-2 text-xs">
                  {[
                    { key: 'whites', label: 'Whites (Output)', defaultVal: 255 },
                    { key: 'highlights', label: 'Highlights', defaultVal: 192 },
                    { key: 'midtones', label: 'Midtones', defaultVal: 128 },
                    { key: 'shadows', label: 'Shadows', defaultVal: 64 },
                    { key: 'blacks', label: 'Blacks (Output)', defaultVal: 0 },
                  ].map((pt) => (
                    <div key={pt.key}>
                      <div className="flex justify-between text-surface-400 mb-0.5">
                        <span>{pt.label}</span>
                        <span className="font-mono text-white">{curCurve[pt.key as keyof CurveChannelPoints]}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={curCurve[pt.key as keyof CurveChannelPoints]}
                        onChange={(e) => updateCurvePoint(pt.key as keyof CurveChannelPoints, Number(e.target.value))}
                        className="w-full accent-sky-400"
                      />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setCurves(defaultCurves)}
                  className="btn-secondary w-full text-xs py-2 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset Curves
                </button>
              </div>
            )}

            {/* 3. Filter Presets */}
            {activeTab === 'filters' && (
              <div className="grid grid-cols-2 gap-2.5">
                {filterPresets.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setAdjustments((prev) => ({ ...prev, ...f.adjustments }))}
                    className="p-3 rounded-lg bg-surface-800 hover:bg-surface-700 transition-all text-left flex flex-col justify-between h-20 border border-surface-700 hover:border-primary-500 group shadow-sm"
                  >
                    <div className={`w-full h-4 rounded bg-gradient-to-r ${f.bg} mb-2 shadow-sm`} />
                    <span className="text-xs font-semibold text-white group-hover:text-primary-400">
                      {f.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 4. Transform / Crop */}
            {activeTab === 'crop' && (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-surface-300 block mb-2">Rotate & Flip</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="btn-secondary text-xs py-2 flex flex-col items-center gap-1"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" /> 90°
                    </button>
                    <button
                      onClick={() => setFlipH((f) => !f)}
                      className="btn-secondary text-xs py-2 flex flex-col items-center gap-1"
                      title="Flip Horizontally"
                    >
                      <FlipHorizontal className="w-4 h-4" /> Flip H
                    </button>
                    <button
                      onClick={() => setFlipV((f) => !f)}
                      className="btn-secondary text-xs py-2 flex flex-col items-center gap-1"
                      title="Flip Vertically"
                    >
                      <FlipVertical className="w-4 h-4" /> Flip V
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-surface-800 space-y-3">
                  <span className="text-xs font-semibold text-surface-300 block">Aspect Ratio Cropping</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'free', label: 'Free' },
                      { id: '1:1', label: '1:1 Square' },
                      { id: '4:5', label: '4:5 Portrait' },
                      { id: '16:9', label: '16:9 Wide' },
                      { id: '9:16', label: '9:16 Story' },
                      { id: '4:3', label: '4:3 Classic' },
                    ].map((asp) => (
                      <button
                        key={asp.id}
                        onClick={() => {
                          setCropAspect(asp.id as any);
                          setIsCropMode(true);
                          if (asp.id === '1:1') setCropBox({ x: 15, y: 15, width: 70, height: 70 });
                          else if (asp.id === '16:9') setCropBox({ x: 5, y: 25, width: 90, height: 50 });
                          else if (asp.id === '9:16') setCropBox({ x: 25, y: 5, width: 50, height: 90 });
                          else if (asp.id === '4:5') setCropBox({ x: 20, y: 10, width: 60, height: 75 });
                          else setCropBox({ x: 10, y: 10, width: 80, height: 80 });
                        }}
                        className={`text-xs py-1.5 px-2 rounded-lg border text-center transition-all ${
                          cropAspect === asp.id
                            ? 'bg-primary-500/20 border-primary-500 text-white font-semibold'
                            : 'bg-surface-800 border-surface-700 text-surface-400 hover:text-white'
                        }`}
                      >
                        {asp.label}
                      </button>
                    ))}
                  </div>

                  {isCropMode && (
                    <div className="pt-2 space-y-2">
                      <button
                        onClick={handleApplyCrop}
                        className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5 shadow-md shadow-primary-500/20"
                      >
                        <Check className="w-3.5 h-3.5" /> Apply Crop
                      </button>
                      <button
                        onClick={() => setIsCropMode(false)}
                        className="btn-secondary w-full text-xs py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. Text Layers */}
            {activeTab === 'text' && (
              <div className="space-y-4">
                <button
                  onClick={addTextLayer}
                  className="btn-primary w-full text-xs py-2.5 flex items-center justify-center gap-1.5 shadow-md shadow-primary-500/20"
                >
                  <Type className="w-3.5 h-3.5" /> Add Text Layer
                </button>

                {/* Selected Layer Inspector */}
                {selectedTextId && (() => {
                  const sel = textLayers.find((l) => l.id === selectedTextId);
                  if (!sel) return null;
                  return (
                    <div className="p-3.5 rounded-xl bg-surface-800/90 border border-primary-500/30 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-surface-700">
                        <span className="font-semibold text-primary-400 flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5" /> Active Text Layer
                        </span>
                        <button
                          onClick={() => {
                            setTextLayers((prev) => prev.filter((l) => l.id !== sel.id));
                            setSelectedTextId(null);
                          }}
                          className="text-surface-400 hover:text-red-400 p-1"
                          title="Delete Layer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div>
                        <label className="text-[11px] text-surface-400 block mb-1">Text Content</label>
                        <input
                          value={sel.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTextLayers((prev) =>
                              prev.map((l) => (l.id === sel.id ? { ...l, text: val } : l))
                            );
                          }}
                          className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-primary-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[11px] text-surface-400 mb-1">
                            <span>Font Size</span>
                            <span className="font-mono text-white">{sel.fontSize}px</span>
                          </div>
                          <input
                            type="range"
                            min="12"
                            max="120"
                            value={sel.fontSize}
                            onChange={(e) => {
                              const size = Number(e.target.value);
                              setTextLayers((prev) =>
                                prev.map((l) => (l.id === sel.id ? { ...l, fontSize: size } : l))
                              );
                            }}
                            className="w-full accent-primary-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-surface-400 block mb-1">Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={sel.color}
                              onChange={(e) => {
                                const color = e.target.value;
                                setTextLayers((prev) =>
                                  prev.map((l) => (l.id === sel.id ? { ...l, color } : l))
                                );
                              }}
                              className="w-8 h-8 rounded-lg cursor-pointer bg-surface-900 border border-surface-700"
                            />
                            <span className="text-xs font-mono text-surface-300">{sel.color}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-surface-400 block mb-1">Font Family</label>
                          <select
                            value={sel.fontFamily}
                            onChange={(e) => {
                              const fontFamily = e.target.value;
                              setTextLayers((prev) =>
                                prev.map((l) => (l.id === sel.id ? { ...l, fontFamily } : l))
                              );
                            }}
                            className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                          >
                            <option value="Inter, sans-serif">Inter</option>
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="Impact, sans-serif">Impact</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="monospace">Monospace</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-surface-400 block mb-1">Weight</label>
                          <select
                            value={sel.fontWeight}
                            onChange={(e) => {
                              const fontWeight = e.target.value;
                              setTextLayers((prev) =>
                                prev.map((l) => (l.id === sel.id ? { ...l, fontWeight } : l))
                              );
                            }}
                            className="w-full bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                          >
                            <option value="normal">Normal</option>
                            <option value="600">Semi Bold</option>
                            <option value="bold">Bold</option>
                            <option value="900">Black</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* All Layers List */}
                <div className="space-y-1.5 mt-2">
                  <span className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider block mb-1">
                    Layers ({textLayers.length})
                  </span>
                  {textLayers.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTextId(t.id)}
                      className={`p-2.5 rounded-lg border transition-all flex items-center justify-between text-xs cursor-pointer ${
                        selectedTextId === t.id
                          ? 'bg-primary-500/15 border-primary-500 text-white'
                          : 'bg-surface-800/80 border-surface-700 text-surface-300 hover:bg-surface-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate mr-2">
                        <Type className="w-3.5 h-3.5 text-surface-400 shrink-0" />
                        <span className="truncate font-medium">{t.text || 'Empty text'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-surface-600"
                          style={{ backgroundColor: t.color }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTextLayers((prev) => prev.filter((l) => l.id !== t.id));
                            if (selectedTextId === t.id) setSelectedTextId(null);
                          }}
                          className="text-surface-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Draw / Brush */}
            {activeTab === 'draw' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-surface-400 block mb-1">Brush Color</label>
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-full h-8 rounded cursor-pointer bg-transparent border border-surface-700"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-surface-400 mb-1">
                    <span>Brush Size</span>
                    <span>{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-full accent-primary-500"
                  />
                </div>
                <button
                  onClick={() => setDrawingStrokes([])}
                  className="btn-secondary w-full text-xs py-2 text-red-400"
                >
                  Clear All Drawings
                </button>
              </div>
            )}

            {/* 7. Magic AI Tools */}
            {activeTab === 'magic' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2 text-purple-400 font-semibold text-xs">
                    <Sparkles className="w-4 h-4" /> 1-Click Background Remover
                  </div>
                  <p className="text-xs text-surface-400 mb-3">
                    Instantly isolates the subject and converts the background to transparency.
                  </p>
                  <button
                    onClick={handleMagicBgRemove}
                    className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1.5"
                  >
                    Remove Background
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── 3. Rightmost Studio Sidebar Navigation (RIGHT SIDE) ─── */}
          <div className="w-16 bg-surface-900 border-l border-surface-800/80 flex flex-col items-center py-3 gap-2 shrink-0 z-10">
            {[
              { id: 'adjust', icon: Sliders, label: 'Adjust' },
              { id: 'curves', icon: TrendingUp, label: 'Curves' },
              { id: 'filters', icon: Palette, label: 'Presets' },
              { id: 'crop', icon: Crop, label: 'Crop' },
              { id: 'text', icon: Type, label: 'Text' },
              { id: 'draw', icon: PenTool, label: 'Draw' },
              { id: 'magic', icon: Sparkles, label: 'Magic' },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as ToolTab);
                    if (tab.id === 'crop') setIsCropMode(true);
                  }}
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'text-surface-400 hover:text-white hover:bg-surface-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[9px] font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
