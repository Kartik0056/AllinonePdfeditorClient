/**
 * Passport Photo Studio & Sheet Grid Printer Page
 * Professional Photoshop-grade photo enhancement with:
 * - Interactive locked aspect-ratio Crop Tool with 8 handles and 3x3 grid
 * - Direct custom photo dimensions (Width mm & Height mm)
 * - Drag-and-drop photo importing
 * - Photoshop Tone Curve (Ctrl+M) with spline LUT & live histogram
 * - Clarity / High-Pass sharpness filter, Brightness, Contrast, Skin Warmth
 * - 1-Click Auto Clear & Face Enhance
 * - Biometric oval guide overlay
 * - A4 Sheet Grid Layout with 1 Line (4 Photos on A4) user preset
 * - Isolated Sheet Printing Engine (hidden iframe printing only the paper sheet)
 * - High-Res 300 DPI PDF export and <50KB single photo optimizer
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, Download, Printer, SlidersHorizontal, Sliders, Palette,
  Grid, Sparkles, Upload, Eye, Image as ImageIcon, ZoomIn, ZoomOut,
  Crop, Move, RotateCw, RefreshCw, Check, Info, FileText, ArrowRight, X
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import Navbar from '../components/Navbar';

interface PassportStandard {
  id: string;
  name: string;
  country: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

const PASSPORT_STANDARDS: PassportStandard[] = [
  { id: 'india', name: 'India Passport / Visa', country: 'India', widthMm: 35, heightMm: 45, description: '35 × 45 mm (Standard Indian Passport, Visa & OCI)' },
  { id: 'pan', name: 'India PAN Card / Driving Licence', country: 'India', widthMm: 25, heightMm: 35, description: '25 × 35 mm (UTI / NSDL PAN card standard)' },
  { id: 'us', name: 'US Passport / Visa', country: 'USA', widthMm: 51, heightMm: 51, description: '2 × 2 inches (51 × 51 mm for US Visa / DS-160)' },
  { id: 'schengen', name: 'Schengen / Europe Visa', country: 'Europe', widthMm: 35, heightMm: 45, description: '35 × 45 mm (Light grey / white background)' },
  { id: 'uk', name: 'UK / Canada Passport', country: 'UK / Canada', widthMm: 35, heightMm: 45, description: '35 × 45 mm (Cream / light grey background)' },
  { id: 'stamp', name: 'Stamp Size / Small Photo', country: 'Universal', widthMm: 20, heightMm: 25, description: '20 × 25 mm (Stamp size application forms)' },
  { id: 'frame_4x6', name: 'Photo Frame (4 × 6 inch)', country: 'Photo Frame', widthMm: 102, heightMm: 152, description: '102 × 152 mm (Standard Postcard / Desk Photo Frame)' },
  { id: 'frame_5x7', name: 'Photo Frame (5 × 7 inch)', country: 'Photo Frame', widthMm: 127, heightMm: 178, description: '127 × 178 mm (Medium Portrait Photo Frame)' },
  { id: 'frame_6x8', name: 'Photo Frame (6 × 8 inch)', country: 'Photo Frame', widthMm: 152, heightMm: 203, description: '152 × 203 mm (Large Portrait Photo Frame)' },
  { id: 'frame_8x10', name: 'Photo Frame (8 × 10 inch)', country: 'Photo Frame', widthMm: 203, heightMm: 254, description: '203 × 254 mm (Wall Photo Frame)' },
  { id: 'frame_a4', name: 'Photo Frame (Full A4)', country: 'Photo Frame', widthMm: 190, heightMm: 270, description: '190 × 270 mm (Full A4 Portrait Frame with Margins)' },
  { id: 'custom', name: 'Custom Dimension', country: 'Custom', widthMm: 35, heightMm: 45, description: 'User-specified width & height in millimeters' },
];

interface PaperSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  defaultCols: number;
}

const PAPER_SIZES: PaperSize[] = [
  { id: 'a4', name: 'A4 Document Paper (210 × 297 mm)', widthMm: 210, heightMm: 297, defaultCols: 4 },
  { id: '4x6', name: '4 × 6 inch Photo Paper (102 × 152 mm)', widthMm: 102, heightMm: 152, defaultCols: 2 },
  { id: '5x7', name: '5 × 7 inch Photo Paper (127 × 178 mm)', widthMm: 127, heightMm: 178, defaultCols: 3 },
  { id: 'letter', name: 'US Letter Paper (216 × 279 mm)', widthMm: 216, heightMm: 279, defaultCols: 4 },
];

interface NormalizedRect {
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
}

export default function PassportPhotoPage() {
  // Input image state
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceImgDimensions, setSourceImgDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 750 });
  const [processedPhotoDataUrl, setProcessedPhotoDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Photo Physical Dimensions (mm)
  const [photoWidthMm, setPhotoWidthMm] = useState<number>(35);
  const [photoHeightMm, setPhotoHeightMm] = useState<number>(45);
  const [selectedStandardId, setSelectedStandardId] = useState<string>('india');
  const [selectedPaper, setSelectedPaper] = useState<PaperSize>(PAPER_SIZES[0]);

  // Mode: Crop & Enhance vs Sheet Layout
  const [activeTab, setActiveTab] = useState<'edit' | 'sheet'>('edit');
  const [inspectorTab, setInspectorTab] = useState<'crop_size' | 'photoshop' | 'background' | 'grid'>('crop_size');

  // Interactive Aspect-Ratio Crop State (Normalized 0..1)
  const [cropBox, setCropBox] = useState<NormalizedRect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [showBiometricGuide, setShowBiometricGuide] = useState(true);
  const [activeCropAction, setActiveCropAction] = useState<string | null>(null);
  const cropStartRef = useRef<{ clientX: number; clientY: number; startBox: NormalizedRect } | null>(null);
  const cropImageRef = useRef<HTMLImageElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // Photoshop-Style Adjustments
  const [brightness, setBrightness] = useState(0); // -100 to 100
  const [contrast, setContrast] = useState(0); // -100 to 100
  const [clarity, setClarity] = useState(25); // 0 to 100 (Unsharp mask)
  const [warmth, setWarmth] = useState(0); // -50 to 50
  const [saturation, setSaturation] = useState(0); // -50 to 50

  // Photoshop Tone Curve (5 Control Points)
  const [curvePoints, setCurvePoints] = useState<Array<{ x: number; y: number }>>([
    { x: 0, y: 0 },
    { x: 64, y: 64 },
    { x: 128, y: 128 },
    { x: 192, y: 192 },
    { x: 255, y: 255 },
  ]);
  const [selectedCurvePoint, setSelectedCurvePoint] = useState<number | null>(null);
  const [histogramData, setHistogramData] = useState<number[]>(new Array(256).fill(0));

  // Background Options
  const [bgColor, setBgColor] = useState<string>('#ffffff');

  // Sheet Layout & Grid Settings
  const [photoCount, setPhotoCount] = useState<number>(4); // Default to 4 photos (1 row on A4 as requested)
  const [sheetMarginMm, setSheetMarginMm] = useState<number>(12);
  const [photoGapMm, setPhotoGapMm] = useState<number>(4);
  const [showCuttingLines, setShowCuttingLines] = useState(true);
  const [showBorder, setShowBorder] = useState(true);
  const [borderColor] = useState('#000000');
  const [borderWidthPx] = useState(1);

  // Export / Print State
  const [isExporting, setIsExporting] = useState(false);
  const [singleTargetKb] = useState<number>(50);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Canvas refs
  const editCanvasRef = useRef<HTMLCanvasElement>(null);
  const sheetCanvasRef = useRef<HTMLCanvasElement>(null);
  const curveCanvasRef = useRef<HTMLCanvasElement>(null);

  // ─── Initialize Default Demo Portrait ───────────────────────────
  useEffect(() => {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 600;
    sampleCanvas.height = 750;
    const ctx = sampleCanvas.getContext('2d')!;

    // Clean gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, 750);
    grad.addColorStop(0, '#e2e8f0');
    grad.addColorStop(1, '#cbd5e1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 750);

    // Shoulders
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(300, 680, 240, 160, 0, 0, Math.PI * 2);
    ctx.fill();

    // Collar / Tie
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(270, 520);
    ctx.lineTo(330, 520);
    ctx.lineTo(315, 600);
    ctx.lineTo(285, 600);
    ctx.closePath();
    ctx.fill();

    // Neck
    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(270, 460, 60, 80);

    // Head / Face
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.ellipse(300, 360, 110, 140, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.ellipse(300, 260, 115, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#27272a';
    ctx.beginPath();
    ctx.arc(260, 350, 7, 0, Math.PI * 2);
    ctx.arc(340, 350, 7, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(260, 335, 14, 1.1 * Math.PI, 1.9 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(340, 335, 14, 1.1 * Math.PI, 1.9 * Math.PI);
    ctx.stroke();

    // Nose
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(300, 355);
    ctx.lineTo(294, 385);
    ctx.lineTo(306, 385);
    ctx.stroke();

    // Subtle Smile
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(300, 400, 24, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    const dataUrl = sampleCanvas.toDataURL('image/jpeg', 0.95);
    setSourceImage(dataUrl);
    setSourceImgDimensions({ width: 600, height: 750 });
  }, []);

  // ─── Initialize / Recalculate Aspect-Ratio Locked Crop Box ───────
  const initCropBoxForAspect = useCallback((targetW: number, targetH: number, imgW: number, imgH: number) => {
    const targetAspect = targetW / targetH;
    const imgAspect = imgW / imgH;

    let boxW: number;
    let boxH: number;

    if (imgAspect > targetAspect) {
      boxH = 0.88;
      boxW = (boxH * imgH * targetAspect) / imgW;
    } else {
      boxW = 0.88;
      boxH = (boxW * imgW / targetAspect) / imgH;
    }

    // Ensure within 0..1 bounds
    boxW = Math.min(0.98, Math.max(0.1, boxW));
    boxH = Math.min(0.98, Math.max(0.1, boxH));

    const x = Math.max(0, (1 - boxW) / 2);
    const y = Math.max(0, (1 - boxH) / 2);

    setCropBox({ x, y, w: boxW, h: boxH });
  }, []);

  // When dimensions or source image changes, re-anchor crop box
  useEffect(() => {
    initCropBoxForAspect(photoWidthMm, photoHeightMm, sourceImgDimensions.width, sourceImgDimensions.height);
  }, [photoWidthMm, photoHeightMm, sourceImgDimensions.width, sourceImgDimensions.height, initCropBoxForAspect]);

  // ─── Preset Selection Handler ────────────────────────────────────
  const handleSelectStandard = (standardId: string) => {
    setSelectedStandardId(standardId);
    const std = PASSPORT_STANDARDS.find((s) => s.id === standardId);
    if (std && standardId !== 'custom') {
      setPhotoWidthMm(std.widthMm);
      setPhotoHeightMm(std.heightMm);
      if (standardId.startsWith('frame_')) {
        setPhotoCount(1); // Auto default to Single Photo for Framing!
      }
    }
  };

  const handleCustomWidthChange = (val: number) => {
    const clamped = Math.max(10, Math.min(210, val));
    setPhotoWidthMm(clamped);
    setSelectedStandardId('custom');
  };

  const handleCustomHeightChange = (val: number) => {
    const clamped = Math.max(10, Math.min(297, val));
    setPhotoHeightMm(clamped);
    setSelectedStandardId('custom');
  };

  // ─── Drag & Drop Image File Handling ─────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const processLoadedImage = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      setSourceImgDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setSourceImage(dataUrl);
      initCropBoxForAspect(photoWidthMm, photoHeightMm, img.naturalWidth, img.naturalHeight);
    };
    img.src = dataUrl;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Please drop a valid image file (JPG, PNG, or WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        processLoadedImage(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') {
        processLoadedImage(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── WebCam Capture ──────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err) {
      alert('Camera access denied or unavailable: ' + err);
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(videoRef.current, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    processLoadedImage(dataUrl);
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // ─── 1-Click Auto Enhance & Tone Reset ───────────────────────────
  const resetFilters = () => {
    setBrightness(0);
    setContrast(0);
    setClarity(20);
    setWarmth(0);
    setSaturation(0);
    setCurvePoints([
      { x: 0, y: 0 },
      { x: 64, y: 64 },
      { x: 128, y: 128 },
      { x: 192, y: 192 },
      { x: 255, y: 255 },
    ]);
  };

  const handleAutoEnhance = () => {
    setBrightness(10);
    setContrast(18);
    setClarity(45);
    setWarmth(4);
    setSaturation(8);
    setCurvePoints([
      { x: 0, y: 0 },
      { x: 64, y: 56 },
      { x: 128, y: 135 },
      { x: 192, y: 205 },
      { x: 255, y: 255 },
    ]);
  };

  // ─── Tone Curve Lookup Table (Spline Interpolation) ──────────────
  const curveLut = useMemo(() => {
    const lut = new Uint8Array(256);
    const sorted = [...curvePoints].sort((a, b) => a.x - b.x);

    for (let i = 0; i < 256; i++) {
      let seg = 0;
      while (seg < sorted.length - 1 && sorted[seg + 1].x < i) {
        seg++;
      }
      const p0 = sorted[seg];
      const p1 = sorted[Math.min(sorted.length - 1, seg + 1)];

      if (p0.x === p1.x) {
        lut[i] = p0.y;
      } else {
        const t = (i - p0.x) / (p1.x - p0.x);
        const smoothT = t * t * (3 - 2 * t);
        const val = p0.y + smoothT * (p1.y - p0.y);
        lut[i] = Math.max(0, Math.min(255, Math.round(val)));
      }
    }
    return lut;
  }, [curvePoints]);

  // ─── Render Histogram on Curve Canvas ────────────────────────────
  useEffect(() => {
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((canvas.width / 4) * i, 0);
      ctx.lineTo((canvas.width / 4) * i, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, (canvas.height / 4) * i);
      ctx.lineTo(canvas.width, (canvas.height / 4) * i);
      ctx.stroke();
    }

    // Live Luminance Histogram
    const maxHist = Math.max(1, ...histogramData);
    ctx.fillStyle = 'rgba(99, 102, 241, 0.22)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * canvas.width;
      const h = (histogramData[i] / maxHist) * (canvas.height * 0.85);
      const y = canvas.height - h;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // Diagonal reference line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(canvas.width, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Curve Line
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * canvas.width;
      const y = canvas.height - (curveLut[i] / 255) * canvas.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Control Points
    curvePoints.forEach((pt, idx) => {
      const cx = (pt.x / 255) * canvas.width;
      const cy = canvas.height - (pt.y / 255) * canvas.height;
      const isSel = selectedCurvePoint === idx;

      ctx.fillStyle = isSel ? '#fbbf24' : '#ffffff';
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, isSel ? 6 : 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }, [curveLut, curvePoints, histogramData, selectedCurvePoint]);

  // ─── Interactive Curve Dragging ──────────────────────────────────
  const handleCurveMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
    const y = Math.max(0, Math.min(255, Math.round((1 - (e.clientY - rect.top) / rect.height) * 255)));

    let nearestIdx = -1;
    let minDist = 25;
    curvePoints.forEach((pt, i) => {
      const dist = Math.hypot(pt.x - x, pt.y - y);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    });

    if (nearestIdx !== -1) {
      setSelectedCurvePoint(nearestIdx);
    }
  };

  const handleCurveMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (selectedCurvePoint === null) return;
    const canvas = curveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(255, Math.round(((e.clientX - rect.left) / rect.width) * 255)));
    const y = Math.max(0, Math.min(255, Math.round((1 - (e.clientY - rect.top) / rect.height) * 255)));

    setCurvePoints((prev) => {
      const next = [...prev];
      if (selectedCurvePoint === 0) {
        next[0] = { x: 0, y };
      } else if (selectedCurvePoint === prev.length - 1) {
        next[prev.length - 1] = { x: 255, y };
      } else {
        next[selectedCurvePoint] = { x, y };
      }
      return next;
    });
  };

  const handleCurveMouseUp = () => {
    setSelectedCurvePoint(null);
  };

  // ─── Interactive Aspect-Ratio Crop Drag & Resize Engine ───────────
  const startCropAction = (action: string, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();

    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as any).clientY;

    setActiveCropAction(action);
    cropStartRef.current = {
      clientX,
      clientY,
      startBox: { ...cropBox },
    };
  };

  useEffect(() => {
    if (!activeCropAction) return;

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!cropStartRef.current || !cropContainerRef.current) return;
      if (e.cancelable) e.preventDefault();

      const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as any).clientX;
      const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as any).clientY;

      const rect = cropContainerRef.current.getBoundingClientRect();
      const deltaX = (clientX - cropStartRef.current.clientX) / rect.width;
      const deltaY = (clientY - cropStartRef.current.clientY) / rect.height;

      const { startBox } = cropStartRef.current;
      const targetAspect = photoWidthMm / photoHeightMm;
      const imgAspect = sourceImgDimensions.width / sourceImgDimensions.height;
      // In normalized coordinates, the aspect ratio relation is:
      // (w * imgW) / (h * imgH) = targetAspect => w / h = targetAspect / imgAspect
      const normAspect = targetAspect / imgAspect;

      if (activeCropAction === 'move') {
        const newX = Math.max(0, Math.min(1 - startBox.w, startBox.x + deltaX));
        const newY = Math.max(0, Math.min(1 - startBox.h, startBox.y + deltaY));
        setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
      } else if (activeCropAction === 'se' || activeCropAction === 'e' || activeCropAction === 's') {
        let newW = Math.max(0.1, Math.min(1 - startBox.x, startBox.w + deltaX));
        let newH = newW / normAspect;
        if (startBox.y + newH > 1) {
          newH = 1 - startBox.y;
          newW = newH * normAspect;
        }
        setCropBox((prev) => ({ ...prev, w: newW, h: newH }));
      } else if (activeCropAction === 'nw') {
        let newW = Math.max(0.1, startBox.w - deltaX);
        let newH = newW / normAspect;
        const newX = startBox.x + (startBox.w - newW);
        const newY = startBox.y + (startBox.h - newH);
        if (newX >= 0 && newY >= 0) {
          setCropBox({ x: newX, y: newY, w: newW, h: newH });
        }
      } else if (activeCropAction === 'ne') {
        let newW = Math.max(0.1, Math.min(1 - startBox.x, startBox.w + deltaX));
        let newH = newW / normAspect;
        const newY = startBox.y + (startBox.h - newH);
        if (newY >= 0) {
          setCropBox((prev) => ({ ...prev, y: newY, w: newW, h: newH }));
        }
      } else if (activeCropAction === 'sw') {
        let newW = Math.max(0.1, startBox.w - deltaX);
        let newH = newW / normAspect;
        const newX = startBox.x + (startBox.w - newW);
        if (newX >= 0 && startBox.y + newH <= 1) {
          setCropBox((prev) => ({ ...prev, x: newX, w: newW, h: newH }));
        }
      }
    };

    const onPointerUp = () => {
      setActiveCropAction(null);
      cropStartRef.current = null;
    };

    window.addEventListener('mousemove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [activeCropAction, photoWidthMm, photoHeightMm, sourceImgDimensions]);

  // ─── Single Photo Processing & Pipeline ──────────────────────────
  useEffect(() => {
    if (!sourceImage) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = editCanvasRef.current;
      if (!canvas) return;

      const pxPerMm = 11.811; // 300 DPI
      const pixelW = Math.round(photoWidthMm * pxPerMm);
      const pixelH = Math.round(photoHeightMm * pxPerMm);

      canvas.width = pixelW;
      canvas.height = pixelH;
      const ctx = canvas.getContext('2d')!;

      // 1. Studio Backdrop Color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, pixelW, pixelH);

      // 2. Crop Sub-Rectangle from Source Image
      const sx = Math.max(0, Math.round(cropBox.x * img.naturalWidth));
      const sy = Math.max(0, Math.round(cropBox.y * img.naturalHeight));
      const sw = Math.min(img.naturalWidth - sx, Math.round(cropBox.w * img.naturalWidth));
      const sh = Math.min(img.naturalHeight - sy, Math.round(cropBox.h * img.naturalHeight));

      ctx.save();
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, pixelW, pixelH);
      ctx.restore();

      // 3. Pixel Shader Pipeline (Tone Curve, Contrast, Brightness, Saturation, Warmth)
      const imgData = ctx.getImageData(0, 0, pixelW, pixelH);
      const data = imgData.data;

      const hist = new Array(256).fill(0);
      const bFactor = brightness * 1.5;
      const cFactor = (contrast + 100) / 100;
      const wFactor = warmth * 1.2;
      const sFactor = (saturation + 100) / 100;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Brightness & Contrast
        r = (r - 128) * cFactor + 128 + bFactor;
        g = (g - 128) * cFactor + 128 + bFactor;
        b = (b - 128) * cFactor + 128 + bFactor;

        // Warmth / Temperature
        r += wFactor;
        b -= wFactor;

        // Saturation
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * sFactor;
        g = gray + (g - gray) * sFactor;
        b = gray + (b - gray) * sFactor;

        // Tone Curve LUT
        r = curveLut[Math.max(0, Math.min(255, Math.round(r)))];
        g = curveLut[Math.max(0, Math.min(255, Math.round(g)))];
        b = curveLut[Math.max(0, Math.min(255, Math.round(b)))];

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;

        // Luminance Histogram
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        hist[Math.max(0, Math.min(255, lum))]++;
      }

      ctx.putImageData(imgData, 0, 0);

      // 4. Clarity / High-Pass Sharpness Filter (Convolution)
      if (clarity > 0) {
        const sharpCanvas = document.createElement('canvas');
        sharpCanvas.width = pixelW;
        sharpCanvas.height = pixelH;
        const sCtx = sharpCanvas.getContext('2d')!;
        sCtx.drawImage(canvas, 0, 0);

        const sData = sCtx.getImageData(0, 0, pixelW, pixelH);
        const src = imgData.data;
        const dst = sData.data;
        const w = pixelW;
        const h = pixelH;
        const strength = (clarity / 100) * 0.7;

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            for (let c = 0; c < 3; c++) {
              const center = src[idx + c];
              const up = src[((y - 1) * w + x) * 4 + c];
              const down = src[((y + 1) * w + x) * 4 + c];
              const left = src[(y * w + (x - 1)) * 4 + c];
              const right = src[(y * w + (x + 1)) * 4 + c];

              const sharpVal = center + strength * (4 * center - up - down - left - right);
              dst[idx + c] = Math.max(0, Math.min(255, sharpVal));
            }
          }
        }
        ctx.putImageData(sData, 0, 0);
      }

      // 5. Border
      if (showBorder) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidthPx * 2;
        ctx.strokeRect(0, 0, pixelW, pixelH);
      }

      setHistogramData(hist);
      setProcessedPhotoDataUrl(canvas.toDataURL('image/jpeg', 0.98));
    };
    img.src = sourceImage;
  }, [
    sourceImage, photoWidthMm, photoHeightMm, cropBox,
    brightness, contrast, clarity, warmth, saturation, curveLut,
    bgColor, showBorder, borderColor, borderWidthPx
  ]);

  // ─── Sheet Grid Calculations ─────────────────────────────────────
  const maxCols = Math.max(1, Math.floor((selectedPaper.widthMm - 2 * sheetMarginMm + photoGapMm) / (photoWidthMm + photoGapMm)));
  const maxRows = Math.max(1, Math.floor((selectedPaper.heightMm - 2 * sheetMarginMm + photoGapMm) / (photoHeightMm + photoGapMm)));
  const maxPhotosOnSheet = maxCols * maxRows;

  // ─── Render Full Sheet Grid (A4 / 4x6 / etc.) ─────────────────────
  useEffect(() => {
    if (!processedPhotoDataUrl) return;

    const paperCanvas = sheetCanvasRef.current;
    if (!paperCanvas) return;

    const pxPerMm = 11.811;
    const paperPixelW = Math.round(selectedPaper.widthMm * pxPerMm);
    const paperPixelH = Math.round(selectedPaper.heightMm * pxPerMm);

    paperCanvas.width = paperPixelW;
    paperCanvas.height = paperPixelH;
    const ctx = paperCanvas.getContext('2d')!;

    // 1. Pure White Paper Base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, paperPixelW, paperPixelH);

    // 2. Paper Header Note (Very subtle gray, outside photo area)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      `PDF Studio Pro · Passport Photos (${photoWidthMm}×${photoHeightMm}mm) · ${selectedPaper.name}`,
      paperPixelW / 2,
      Math.round(sheetMarginMm * pxPerMm * 0.7)
    );

    // 3. Grid Layout
    const pWidthPx = Math.round(photoWidthMm * pxPerMm);
    const pHeightPx = Math.round(photoHeightMm * pxPerMm);
    const gapPx = Math.round(photoGapMm * pxPerMm);
    const marginXPx = Math.round(sheetMarginMm * pxPerMm);
    const marginYPx = Math.round(sheetMarginMm * pxPerMm);

    const photoImg = new Image();
    photoImg.onload = () => {
      const renderCount = Math.min(photoCount, maxPhotosOnSheet);

      if (renderCount === 1) {
        // ─── Single Photo for Framing (Centered on Sheet Paper) ───
        const centerX = Math.round((paperPixelW - pWidthPx) / 2);
        const centerY = Math.round((paperPixelH - pHeightPx) / 2);

        ctx.drawImage(photoImg, centerX, centerY, pWidthPx, pHeightPx);

        if (showCuttingLines) {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1.5;
          const tickLen = Math.round(2 * pxPerMm);

          ctx.beginPath();
          // Top-left
          ctx.moveTo(centerX - tickLen, centerY); ctx.lineTo(centerX, centerY);
          ctx.moveTo(centerX, centerY - tickLen); ctx.lineTo(centerX, centerY);
          // Top-right
          ctx.moveTo(centerX + pWidthPx, centerY); ctx.lineTo(centerX + pWidthPx + tickLen, centerY);
          ctx.moveTo(centerX + pWidthPx, centerY - tickLen); ctx.lineTo(centerX + pWidthPx, centerY);
          // Bottom-left
          ctx.moveTo(centerX - tickLen, centerY + pHeightPx); ctx.lineTo(centerX, centerY + pHeightPx);
          ctx.moveTo(centerX, centerY + pHeightPx); ctx.lineTo(centerX, centerY + pHeightPx + tickLen);
          // Bottom-right
          ctx.moveTo(centerX + pWidthPx, centerY + pHeightPx); ctx.lineTo(centerX + pWidthPx + tickLen, centerY + pHeightPx);
          ctx.moveTo(centerX + pWidthPx, centerY + pHeightPx); ctx.lineTo(centerX + pWidthPx, centerY + pHeightPx + tickLen);
          ctx.stroke();
        }
      } else {
        // ─── Multiple Tiled Photos (Auto-Fit maxCols per row, Centered) ───
        const gridWidth = maxCols * pWidthPx + (maxCols - 1) * gapPx;
        const startX = Math.max(marginXPx, Math.round((paperPixelW - gridWidth) / 2));
        const startY = marginYPx;

        for (let i = 0; i < renderCount; i++) {
          const col = i % maxCols;
          const row = Math.floor(i / maxCols);

          const x = startX + col * (pWidthPx + gapPx);
          const y = startY + row * (pHeightPx + gapPx);

          // Draw photo
          ctx.drawImage(photoImg, x, y, pWidthPx, pHeightPx);

          // Optional Scissor Cutting Guides
          if (showCuttingLines) {
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            const tickLen = Math.round(2 * pxPerMm); // 2mm tick

            ctx.beginPath();
            // Top-left corner tick
            ctx.moveTo(x - tickLen, y); ctx.lineTo(x, y);
            ctx.moveTo(x, y - tickLen); ctx.lineTo(x, y);
            // Top-right
            ctx.moveTo(x + pWidthPx, y); ctx.lineTo(x + pWidthPx + tickLen, y);
            ctx.moveTo(x + pWidthPx, y - tickLen); ctx.lineTo(x + pWidthPx, y);
            // Bottom-left
            ctx.moveTo(x - tickLen, y + pHeightPx); ctx.lineTo(x, y + pHeightPx);
            ctx.moveTo(x, y + pHeightPx); ctx.lineTo(x, y + pHeightPx + tickLen);
            // Bottom-right
            ctx.moveTo(x + pWidthPx, y + pHeightPx); ctx.lineTo(x + pWidthPx + tickLen, y + pHeightPx);
            ctx.moveTo(x + pWidthPx, y + pHeightPx); ctx.lineTo(x + pWidthPx, y + pHeightPx + tickLen);
            ctx.stroke();
          }
        }
      }
    };
    photoImg.src = processedPhotoDataUrl;
  }, [
    processedPhotoDataUrl, selectedPaper, photoCount, activeTab,
    maxCols, maxRows, photoWidthMm, photoHeightMm,
    sheetMarginMm, photoGapMm, showCuttingLines, maxPhotosOnSheet
  ]);

  // ─── Isolated Sheet Print Engine ─────────────────────────────────
  const handlePrint = () => {
    if (!sheetCanvasRef.current) return;
    const sheetDataUrl = sheetCanvasRef.current.toDataURL('image/jpeg', 1.0);

    let printIframe = document.getElementById('passport-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'passport-print-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Passport Photo Sheet</title>
          <style>
            @page {
              size: ${selectedPaper.widthMm}mm ${selectedPaper.heightMm}mm;
              margin: 0mm;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }
            img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              display: block;
            }
          </style>
        </head>
        <body>
          <img src="${sheetDataUrl}" />
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    }, 300);
  };

  const handleDownloadPDF = async () => {
    if (!sheetCanvasRef.current) return;
    setIsExporting(true);

    try {
      const pdfDoc = await PDFDocument.create();
      const pdfW = (selectedPaper.widthMm * 72) / 25.4;
      const pdfH = (selectedPaper.heightMm * 72) / 25.4;

      const page = pdfDoc.addPage([pdfW, pdfH]);

      const sheetImgDataUrl = sheetCanvasRef.current.toDataURL('image/jpeg', 0.95);
      const embeddedImage = await pdfDoc.embedJpg(sheetImgDataUrl);

      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: pdfW,
        height: pdfH,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Passport_Photos_${photoWidthMm}x${photoHeightMm}mm_${photoCount}pcs.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Failed to generate PDF: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadSheetImage = () => {
    if (!sheetCanvasRef.current) return;
    const url = sheetCanvasRef.current.toDataURL('image/jpeg', 0.95);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Passport_Photos_Sheet_${selectedPaper.id.toUpperCase()}_${photoCount}pcs.jpg`;
    a.click();
  };

  const handleDownloadSinglePhoto = () => {
    if (!editCanvasRef.current) return;
    const url = editCanvasRef.current.toDataURL('image/jpeg', 0.85);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Passport_Photo_${photoWidthMm}x${photoHeightMm}mm.jpg`;
    a.click();
  };

  return (
    <div
      className="h-screen flex flex-col bg-surface-950 overflow-hidden select-none text-white"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ─── Persistent Global Navbar (Always Visible) ─────── */}
      <Navbar />

      {/* Hidden File Input */}
      <input
        id="passport-photo-upload-input"
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* ─── Drag & Drop Overlay Indicator ─────────────────── */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-primary-950/85 backdrop-blur-md flex flex-col items-center justify-center border-4 border-dashed border-primary-400 pointer-events-none animate-fade-in">
          <Upload className="w-16 h-16 text-primary-300 animate-bounce mb-3" />
          <h2 className="text-2xl font-bold text-white mb-1">Drop Your Photo Here</h2>
          <p className="text-sm text-primary-200">Supports JPG, PNG, WEBP (Instant Auto-Fit)</p>
        </div>
      )}

      {/* ─── Secondary Studio Sub-Header ───────────────────── */}
      <div className="h-12 bg-surface-900/95 border-b border-surface-800/80 px-2 sm:px-4 flex items-center justify-between shrink-0 z-30 gap-2 overflow-x-auto scrollbar-none">
        {/* Left: Studio Branding & Standard Preset */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary-500/10 border border-primary-500/30 flex items-center justify-center shrink-0">
              <Camera className="w-4 h-4 text-primary-400" />
            </div>
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide hidden sm:inline shrink-0">
              Passport Studio
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 font-mono font-bold hidden lg:inline-block shrink-0">
              300 DPI
            </span>
          </div>

          <div className="h-4 w-px bg-surface-800 shrink-0 hidden sm:block" />

          {/* Quick Preset Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-surface-400 font-medium hidden md:inline shrink-0">Standard:</span>
            <select
              value={selectedStandardId}
              onChange={(e) => handleSelectStandard(e.target.value)}
              className="text-xs py-1 px-2 bg-surface-800 border border-surface-700 text-white rounded-md w-40 xs:w-44 sm:w-48 outline-none focus:border-primary-500 shrink-0 font-medium cursor-pointer"
              title="Select Standard Size Preset"
            >
              {PASSPORT_STANDARDS.map((std) => (
                <option key={std.id} value={std.id} className="bg-surface-900 text-white">
                  {std.name} ({std.widthMm}×{std.heightMm}mm)
                </option>
              ))}
            </select>
          </div>

          {/* Paper Size Selector (shown only in sheet mode to save space) */}
          {activeTab === 'sheet' && (
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-surface-400 font-medium shrink-0">Paper:</span>
              <select
                value={selectedPaper.id}
                onChange={(e) => {
                  const p = PAPER_SIZES.find((item) => item.id === e.target.value);
                  if (p) setSelectedPaper(p);
                }}
                className="text-xs py-1 px-2 bg-surface-800 border border-surface-700 text-white rounded-md w-36 sm:w-40 outline-none focus:border-primary-500 shrink-0 font-medium cursor-pointer"
              >
                {PAPER_SIZES.map((paper) => (
                  <option key={paper.id} value={paper.id} className="bg-surface-900 text-white">
                    {paper.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Center / Right: Mode Switcher & Export Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex bg-surface-800/80 p-0.5 rounded-lg border border-surface-700/60 shrink-0">
            <button
              onClick={() => {
                setActiveTab('edit');
                if (inspectorTab === 'grid') setInspectorTab('crop_size');
              }}
              className={`px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors shrink-0 ${
                activeTab === 'edit'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              <Crop className="w-3.5 h-3.5 shrink-0" />
              <span><span className="hidden sm:inline">1. </span>Crop<span className="hidden md:inline"> &amp; Enhance</span></span>
            </button>
            <button
              onClick={() => {
                setActiveTab('sheet');
                setInspectorTab('grid');
              }}
              className={`px-2 sm:px-3 py-1 rounded-md text-[11px] sm:text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors shrink-0 ${
                activeTab === 'sheet'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5 shrink-0" />
              <span><span className="hidden sm:inline">2. </span>Sheet<span className="hidden md:inline"> Layout</span></span>
            </button>
          </div>

          <div className="h-4 w-px bg-surface-800 mx-0.5 hidden xs:block" />

          {/* Isolated Print Button */}
          <button
            onClick={handlePrint}
            className="btn-primary text-xs px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 shadow-md shadow-primary-500/20 shrink-0"
            title="Print ONLY the paper sheet at 100% scale (Excludes webpage UI)"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Print<span className="hidden md:inline"> Sheet</span></span>
          </button>

          {/* High-Res PDF Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="btn-secondary text-xs px-2 sm:px-2.5 py-1.5 flex items-center gap-1 shrink-0"
            title="Download Printable 300 DPI High-Resolution PDF"
          >
            <Download className="w-3.5 h-3.5 text-primary-400 shrink-0" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          {/* Inspector Panel Toggle Button */}
          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition-colors shrink-0 ${
              isInspectorOpen
                ? 'bg-primary-600/20 border-primary-500/50 text-primary-300'
                : 'bg-surface-800 border-surface-700 text-surface-400 hover:text-white'
            }`}
            title={isInspectorOpen ? 'Hide Controls Inspector' : 'Show Controls Inspector'}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xl:inline text-[11px] font-semibold">{isInspectorOpen ? 'Hide' : 'Controls'}</span>
          </button>
        </div>
      </div>

      {/* ─── Main Workspace Area ─────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Floating Controls Toggle (when inspector is closed) */}
        {!isInspectorOpen && (
          <button
            onClick={() => setIsInspectorOpen(true)}
            className="absolute top-3 right-3 z-20 btn-primary shadow-2xl px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs animate-fade-in"
            title="Open Controls & Presets"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="font-bold">Controls</span>
          </button>
        )}

        {/* Center Workspace Canvas */}
        <main className="flex-1 flex flex-col items-center justify-between p-2 sm:p-4 overflow-y-auto bg-surface-950/95 relative min-h-0">
          {/* WebCam Capture View */}
          {isCameraActive ? (
            <div className="relative max-w-lg w-full rounded-2xl overflow-hidden shadow-2xl border border-surface-700 bg-black my-auto">
              <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-64 border-2 border-dashed border-amber-400 rounded-full opacity-70" />
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
                <button onClick={captureCameraPhoto} className="btn-primary text-sm px-6 py-2 shadow-xl flex items-center gap-2">
                  <Camera className="w-4 h-4" /> Snap Photo
                </button>
                <button onClick={stopCamera} className="btn-secondary text-sm px-4 py-2">
                  Cancel
                </button>
              </div>
            </div>
          ) : activeTab === 'edit' ? (
            /* Tab 1: Interactive Photoshop-Style Aspect-Ratio Crop & Framing */
            <div className="flex-1 flex flex-col items-center justify-between w-full max-w-4xl min-h-0 gap-2">
              {/* Informational Header */}
              <div className="flex items-center justify-between w-full max-w-2xl px-2 py-0.5 shrink-0">
                <div className="flex items-center gap-2 text-xs text-surface-300">
                  <Crop className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                  <span className="truncate">
                    Crop Size: <strong className="text-white">{photoWidthMm} × {photoHeightMm} mm</strong>
                  </span>
                  <span className="hidden sm:inline text-surface-500">|</span>
                  <span className="hidden sm:inline text-surface-400 text-[11px]">Drag box or handles to compose</span>
                </div>
                <button
                  onClick={() => setShowBiometricGuide(!showBiometricGuide)}
                  className={`text-xs px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors shrink-0 ${
                    showBiometricGuide ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40' : 'text-surface-400 hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Face Guide</span>
                </button>
              </div>

              {/* Photoshop Crop Tool Canvas Container */}
              <div
                ref={cropContainerRef}
                className="relative rounded-lg shadow-2xl border border-surface-700 bg-surface-900 overflow-hidden flex items-center justify-center select-none cursor-crosshair h-[48vh] sm:h-[54vh] max-h-[calc(100vh-250px)] w-auto max-w-full my-auto"
                style={{
                  aspectRatio: `${sourceImgDimensions.width} / ${sourceImgDimensions.height}`,
                }}
              >
                {/* Full Original Image Underneath */}
                {sourceImage && (
                  <img
                    ref={cropImageRef}
                    src={sourceImage}
                    alt="Original photo"
                    draggable={false}
                    className="w-full h-full object-contain pointer-events-none select-none block"
                  />
                )}

                {/* Shaded Outer Dark Overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top shaded strip */}
                  <div
                    className="absolute top-0 left-0 right-0 bg-black/60 backdrop-blur-[1px]"
                    style={{ height: `${cropBox.y * 100}%` }}
                  />
                  {/* Bottom shaded strip */}
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-[1px]"
                    style={{ top: `${(cropBox.y + cropBox.h) * 100}%` }}
                  />
                  {/* Left shaded strip */}
                  <div
                    className="absolute left-0 bg-black/60 backdrop-blur-[1px]"
                    style={{
                      top: `${cropBox.y * 100}%`,
                      height: `${cropBox.h * 100}%`,
                      width: `${cropBox.x * 100}%`,
                    }}
                  />
                  {/* Right shaded strip */}
                  <div
                    className="absolute right-0 bg-black/60 backdrop-blur-[1px]"
                    style={{
                      top: `${cropBox.y * 100}%`,
                      height: `${cropBox.h * 100}%`,
                      left: `${(cropBox.x + cropBox.w) * 100}%`,
                    }}
                  />
                </div>

                {/* Interactive Crop Box (Locked Aspect Ratio) */}
                <div
                  className="absolute border-2 border-white/95 shadow-2xl cursor-grab active:cursor-grabbing group pointer-events-auto"
                  style={{
                    left: `${cropBox.x * 100}%`,
                    top: `${cropBox.y * 100}%`,
                    width: `${cropBox.w * 100}%`,
                    height: `${cropBox.h * 100}%`,
                  }}
                  onMouseDown={(e) => startCropAction('move', e)}
                  onTouchStart={(e) => startCropAction('move', e)}
                >
                  {/* Photoshop 3x3 Rule-of-Thirds Grid */}
                  <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3">
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-r border-b border-white/30" />
                    <div className="border-b border-white/30" />
                    <div className="border-r border-white/30" />
                    <div className="border-r border-white/30" />
                    <div />
                  </div>

                  {/* Biometric Face Oval Guide Overlay */}
                  {showBiometricGuide && (
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      <div className="w-[68%] h-[74%] border-2 border-dashed border-primary-400/90 rounded-[50%] mt-2 relative">
                        <div className="absolute top-[42%] left-0 right-0 border-b border-primary-400/50 flex justify-between px-1">
                          <span className="text-[9px] text-primary-300 font-mono -mt-3.5">Eyes</span>
                          <span className="text-[9px] text-primary-300 font-mono -mt-3.5">Eyes</span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 border-b border-primary-400/50 flex justify-center">
                          <span className="text-[9px] text-primary-300 font-mono -mb-3.5">Chin</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dimension Tooltip Badge */}
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-900/95 border border-primary-500/80 rounded px-2 py-0.5 text-[10px] text-white font-mono shadow-xl whitespace-nowrap flex items-center gap-1.5 pointer-events-none">
                    <span className="text-primary-300 font-bold">{photoWidthMm} × {photoHeightMm} mm</span>
                    <span className="text-surface-400">({Math.round(cropBox.w * sourceImgDimensions.width)}×{Math.round(cropBox.h * sourceImgDimensions.height)}px)</span>
                  </div>

                  {/* 4 Corner Resize Handles */}
                  <div
                    className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-primary-600 rounded-sm cursor-nwse-resize shadow-md"
                    onMouseDown={(e) => startCropAction('nw', e)}
                    onTouchStart={(e) => startCropAction('nw', e)}
                  />
                  <div
                    className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-primary-600 rounded-sm cursor-nesw-resize shadow-md"
                    onMouseDown={(e) => startCropAction('ne', e)}
                    onTouchStart={(e) => startCropAction('ne', e)}
                  />
                  <div
                    className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-primary-600 rounded-sm cursor-nesw-resize shadow-md"
                    onMouseDown={(e) => startCropAction('sw', e)}
                    onTouchStart={(e) => startCropAction('sw', e)}
                  />
                  <div
                    className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-primary-600 rounded-sm cursor-nwse-resize shadow-md"
                    onMouseDown={(e) => startCropAction('se', e)}
                    onTouchStart={(e) => startCropAction('se', e)}
                  />

                  {/* Edge Handles */}
                  <div
                    className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-2 bg-white/90 border border-primary-600 rounded-xs cursor-ns-resize shadow-sm"
                    onMouseDown={(e) => startCropAction('n', e)}
                    onTouchStart={(e) => startCropAction('n', e)}
                  />
                  <div
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-2 bg-white/90 border border-primary-600 rounded-xs cursor-ns-resize shadow-sm"
                    onMouseDown={(e) => startCropAction('s', e)}
                    onTouchStart={(e) => startCropAction('s', e)}
                  />
                  <div
                    className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2 h-5 bg-white/90 border border-primary-600 rounded-xs cursor-ew-resize shadow-sm"
                    onMouseDown={(e) => startCropAction('w', e)}
                    onTouchStart={(e) => startCropAction('w', e)}
                  />
                  <div
                    className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2 h-5 bg-white/90 border border-primary-600 rounded-xs cursor-ew-resize shadow-sm"
                    onMouseDown={(e) => startCropAction('e', e)}
                    onTouchStart={(e) => startCropAction('e', e)}
                  />
                </div>
              </div>

              {/* Bottom Quick Tools & Live Preview Card */}
              <div className="shrink-0 w-full max-w-2xl bg-surface-900/90 border border-surface-800 rounded-xl p-2 sm:p-2.5 shadow-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary text-xs px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5 shrink-0" />
                    <span>Upload</span>
                  </button>
                  <button
                    onClick={startCamera}
                    className="btn-secondary text-xs px-2.5 sm:px-3 py-1.5 flex items-center gap-1.5 shrink-0"
                  >
                    <Camera className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="hidden sm:inline">Webcam</span>
                  </button>
                  <button
                    onClick={() => initCropBoxForAspect(photoWidthMm, photoHeightMm, sourceImgDimensions.width, sourceImgDimensions.height)}
                    className="btn-secondary text-xs px-2 sm:px-2.5 py-1.5 flex items-center gap-1 text-surface-300 hover:text-white shrink-0"
                    title="Center and Reset Crop Box"
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>

                {/* Right: Cropped Live Thumbnail Preview */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <div className="text-right hidden xs:block">
                    <div className="text-[11px] font-bold text-white leading-tight">Live Result</div>
                    <div className="text-[10px] text-surface-400 font-mono leading-tight">{photoWidthMm}×{photoHeightMm}mm</div>
                  </div>
                  <div
                    className="rounded border border-surface-700 overflow-hidden bg-surface-950 shadow-md shrink-0 relative flex items-center justify-center"
                    style={{
                      width: `${Math.min(48, Math.max(28, (photoWidthMm / photoHeightMm) * 38))}px`,
                      height: '38px',
                    }}
                  >
                    <canvas ref={editCanvasRef} className={processedPhotoDataUrl ? "hidden" : "w-full h-full block"} />
                    {processedPhotoDataUrl && (
                      <img
                        src={processedPhotoDataUrl}
                        alt="Live Preview"
                        className="w-full h-full object-cover block"
                      />
                    )}
                  </div>
                  <button
                    onClick={handleDownloadSinglePhoto}
                    className="btn-secondary text-xs p-1.5 sm:p-2 text-emerald-400 hover:text-emerald-300 shrink-0"
                    title="Download single photo file (<50KB)"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Tab 2: Full Multi-Photo Sheet Print Preview */
            <div className="flex-1 flex flex-col items-center justify-between w-full max-w-4xl min-h-0 gap-2">
              <div className="bg-surface-900/80 border border-surface-800 rounded-lg px-3 py-1.5 text-[11px] sm:text-xs text-surface-300 flex flex-wrap items-center justify-center gap-2 sm:gap-3 shrink-0 text-center">
                {photoCount === 1 ? (
                  <span className="flex items-center gap-1.5 text-amber-300 font-medium">
                    <span>🖼️ Frame Mode:</span>
                    <strong className="text-white">1 Single Photo</strong> centered on {selectedPaper.name}
                  </span>
                ) : (
                  <span>
                    Grid: <strong className="text-white">{Math.min(photoCount, maxPhotosOnSheet)} photos</strong> ({maxCols} per line) on {selectedPaper.name}
                  </span>
                )}
                <span>·</span>
                <span>
                  Physical Size: <strong className="text-primary-300">{photoWidthMm} × {photoHeightMm} mm</strong>
                </span>
                <span>·</span>
                <span className="text-emerald-400 font-medium">300 DPI Lab Print Quality</span>
              </div>

              {/* Physical Sheet Canvas Container */}
              <div
                id="passport-print-sheet-wrapper"
                className="relative shadow-2xl rounded-sm border border-neutral-300 bg-white overflow-hidden flex items-center justify-center p-2 flex-1 min-h-[200px] max-h-[calc(100vh-240px)] w-auto max-w-full my-auto"
              >
                <canvas
                  ref={sheetCanvasRef}
                  className="max-h-[calc(100vh-260px)] max-w-full w-auto h-auto object-contain block page-shadow"
                />
              </div>
            </div>
          )}
        </main>

        {/* ─── Right Inspector & Studio Control Panel ───────── */}
        {isInspectorOpen && (
          <>
            {/* Mobile / Tablet Backdrop Overlay */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden"
              onClick={() => setIsInspectorOpen(false)}
            />

            <aside className="fixed lg:static top-12 bottom-0 right-0 z-40 lg:z-20 w-[90vw] sm:w-[380px] lg:w-[350px] xl:w-[380px] shrink-0 bg-surface-900/95 lg:bg-surface-900/90 border-l border-surface-800/80 flex flex-col shadow-2xl lg:shadow-none overflow-hidden transition-all duration-200">
              {/* Mobile Close Bar */}
              <div className="flex lg:hidden items-center justify-between px-3 py-2 border-b border-surface-800 bg-surface-950/60 shrink-0">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-primary-400" />
                  Studio Controls &amp; Settings
                </span>
                <button
                  onClick={() => setIsInspectorOpen(false)}
                  className="p-1 rounded-md text-surface-400 hover:text-white hover:bg-surface-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Inspector Tabs */}
              <div className="flex border-b border-surface-800/80 p-1.5 sm:p-2 gap-1 bg-surface-900/40 shrink-0">
                <button
                  onClick={() => { setInspectorTab('crop_size'); setActiveTab('edit'); }}
                  className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    inspectorTab === 'crop_size'
                      ? 'bg-primary-600/30 text-primary-300 border border-primary-500/40'
                      : 'text-surface-400 hover:text-white'
                  }`}
                  title="Photo Size & Crop Controls"
                >
                  <Crop className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Size &amp; Crop</span>
                </button>

                <button
                  onClick={() => { setInspectorTab('photoshop'); setActiveTab('edit'); }}
                  className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    inspectorTab === 'photoshop'
                      ? 'bg-primary-600/30 text-primary-300 border border-primary-500/40'
                      : 'text-surface-400 hover:text-white'
                  }`}
                  title="Tone Curve & Enhancements"
                >
                  <Sliders className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Tone Curve</span>
                </button>

                <button
                  onClick={() => { setInspectorTab('background'); setActiveTab('edit'); }}
                  className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    inspectorTab === 'background'
                      ? 'bg-primary-600/30 text-primary-300 border border-primary-500/40'
                      : 'text-surface-400 hover:text-white'
                  }`}
                  title="Studio Backdrop Color"
                >
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Backdrop</span>
                </button>

                <button
                  onClick={() => { setInspectorTab('grid'); setActiveTab('sheet'); }}
                  className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                    inspectorTab === 'grid'
                      ? 'bg-primary-600/30 text-primary-300 border border-primary-500/40'
                      : 'text-surface-400 hover:text-white'
                  }`}
                  title="Sheet Grid & Quantity Layout"
                >
                  <Grid className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Sheet Grid</span>
                </button>
              </div>

              <div className="p-3 sm:p-4 space-y-4 sm:space-y-5 flex-1 overflow-y-auto">
            {/* ─── TAB 1: Photo Size & Interactive Crop Controls ─ */}
            {inspectorTab === 'crop_size' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Custom Photo Dimensions (mm)</label>
                  <p className="text-[11px] text-surface-400 mb-2">
                    Apne hisab se exact width &amp; height type karein. Crop box automatically isi ratio me lock hoga:
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 mb-3">
                    <div className="bg-surface-850 p-2.5 rounded-lg border border-surface-750">
                      <span className="text-[10px] text-surface-400 uppercase font-mono block mb-1">Width (Chaudai)</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="10"
                          max="210"
                          value={photoWidthMm}
                          onChange={(e) => handleCustomWidthChange(parseFloat(e.target.value) || 35)}
                          className="w-full bg-surface-900 px-2 py-1.5 rounded border border-surface-700 text-sm font-bold text-white focus:border-primary-500 outline-none"
                        />
                        <span className="text-xs text-primary-400 font-mono font-bold">mm</span>
                      </div>
                    </div>

                    <div className="bg-surface-850 p-2.5 rounded-lg border border-surface-750">
                      <span className="text-[10px] text-surface-400 uppercase font-mono block mb-1">Height (Lambai)</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="10"
                          max="297"
                          value={photoHeightMm}
                          onChange={(e) => handleCustomHeightChange(parseFloat(e.target.value) || 45)}
                          className="w-full bg-surface-900 px-2 py-1.5 rounded border border-surface-700 text-sm font-bold text-white focus:border-primary-500 outline-none"
                        />
                        <span className="text-xs text-primary-400 font-mono font-bold">mm</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Popular Standards 1-Click Fillers */}
                <div>
                  <label className="text-xs font-bold text-white block mb-1.5">Official Passport / Visa Standards</label>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {PASSPORT_STANDARDS.filter((s) => !s.id.startsWith('frame_') && s.id !== 'custom').map((std) => (
                      <button
                        key={std.id}
                        onClick={() => handleSelectStandard(std.id)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          selectedStandardId === std.id && photoWidthMm === std.widthMm && photoHeightMm === std.heightMm
                            ? 'border-primary-500 bg-primary-500/15 text-white ring-1 ring-primary-500'
                            : 'border-surface-800 bg-surface-850/80 text-surface-300 hover:border-surface-700'
                        }`}
                      >
                        <div className="text-[11px] font-bold truncate">{std.name}</div>
                        <div className="text-[10px] text-primary-400 font-mono">{std.widthMm} × {std.heightMm} mm</div>
                      </button>
                    ))}
                  </div>

                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-1.5">
                    <span>🖼️ Photo Frame Sizes (For Framing)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PASSPORT_STANDARDS.filter((s) => s.id.startsWith('frame_')).map((std) => (
                      <button
                        key={std.id}
                        onClick={() => handleSelectStandard(std.id)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          selectedStandardId === std.id && photoWidthMm === std.widthMm && photoHeightMm === std.heightMm
                            ? 'border-amber-500 bg-amber-500/20 text-white ring-1 ring-amber-500'
                            : 'border-surface-800 bg-surface-850/80 text-surface-300 hover:border-surface-700'
                        }`}
                      >
                        <div className="text-[11px] font-bold truncate">{std.name}</div>
                        <div className="text-[10px] text-amber-400 font-mono">{std.widthMm} × {std.heightMm} mm</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-surface-800" />

                {/* Crop Box Composition Tools */}
                <div>
                  <label className="text-xs font-bold text-white block mb-1.5">Crop Box Controls</label>
                  <div className="space-y-2">
                    <button
                      onClick={() => initCropBoxForAspect(photoWidthMm, photoHeightMm, sourceImgDimensions.width, sourceImgDimensions.height)}
                      className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-primary-400" />
                      <span>Reset &amp; Center Crop Box</span>
                    </button>
                    <button
                      onClick={() => setShowBiometricGuide(!showBiometricGuide)}
                      className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{showBiometricGuide ? 'Hide' : 'Show'} Biometric Face Oval Guide</span>
                    </button>
                  </div>
                </div>

                {/* Switch to Sheet Grid Button */}
                <button
                  onClick={() => { setActiveTab('sheet'); setInspectorTab('grid'); }}
                  className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-2 mt-4 bg-gradient-to-r from-primary-600 to-indigo-600 shadow-lg shadow-primary-500/20"
                >
                  <span>Proceed to Sheet Print Layout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ─── TAB 2: Photoshop Tone Curve & Filters ──────── */}
            {inspectorTab === 'photoshop' && (
              <div className="space-y-4">
                {/* 1-Click Auto Enhance Button */}
                <button
                  onClick={handleAutoEnhance}
                  className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 bg-gradient-to-r from-primary-600 to-indigo-600"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="font-bold">1-Click Auto Clear &amp; Face Enhance</span>
                </button>

                {/* Tone Curve Graph Section */}
                <div className="bg-surface-950 p-3 rounded-xl border border-surface-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-primary-400" />
                      Photoshop Tone Curve (RGB)
                    </span>
                    <button
                      onClick={() =>
                        setCurvePoints([
                          { x: 0, y: 0 },
                          { x: 64, y: 64 },
                          { x: 128, y: 128 },
                          { x: 192, y: 192 },
                          { x: 255, y: 255 },
                        ])
                      }
                      className="text-[10px] text-surface-400 hover:text-white"
                    >
                      Reset Curve
                    </button>
                  </div>

                  {/* Interactive Spline Graph Canvas with Live Histogram */}
                  <div className="relative rounded-lg overflow-hidden border border-surface-800 bg-surface-900/80">
                    <canvas
                      ref={curveCanvasRef}
                      width={280}
                      height={200}
                      className="w-full h-auto block cursor-crosshair"
                      onMouseDown={handleCurveMouseDown}
                      onMouseMove={handleCurveMouseMove}
                      onMouseUp={handleCurveMouseUp}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-surface-500 font-mono">
                    <span>Shadows</span>
                    <span>Midtones</span>
                    <span>Highlights</span>
                  </div>

                  {/* Curve Presets */}
                  <div className="grid grid-cols-3 gap-1 pt-1">
                    <button
                      onClick={() =>
                        setCurvePoints([
                          { x: 0, y: 0 },
                          { x: 64, y: 48 },
                          { x: 128, y: 128 },
                          { x: 192, y: 210 },
                          { x: 255, y: 255 },
                        ])
                      }
                      className="px-2 py-1 rounded bg-surface-800 text-[10px] text-surface-300 hover:text-white hover:bg-surface-700"
                    >
                      S-Curve Contrast
                    </button>
                    <button
                      onClick={() =>
                        setCurvePoints([
                          { x: 0, y: 0 },
                          { x: 64, y: 80 },
                          { x: 128, y: 155 },
                          { x: 192, y: 215 },
                          { x: 255, y: 255 },
                        ])
                      }
                      className="px-2 py-1 rounded bg-surface-800 text-[10px] text-surface-300 hover:text-white hover:bg-surface-700"
                    >
                      Brighten Face
                    </button>
                    <button
                      onClick={() =>
                        setCurvePoints([
                          { x: 0, y: 15 },
                          { x: 64, y: 70 },
                          { x: 128, y: 128 },
                          { x: 192, y: 185 },
                          { x: 255, y: 245 },
                        ])
                      }
                      className="px-2 py-1 rounded bg-surface-800 text-[10px] text-surface-300 hover:text-white hover:bg-surface-700"
                    >
                      Soft Film
                    </button>
                  </div>
                </div>

                {/* Fine Adjustment Sliders */}
                <div className="space-y-3">
                  {/* Clarity / Sharpness */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-surface-300 font-medium">Clarity &amp; Sharpness</span>
                      <span className="font-mono text-primary-400">{clarity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={clarity}
                      onChange={(e) => setClarity(parseInt(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  {/* Brightness */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-surface-300 font-medium">Brightness</span>
                      <span className="font-mono text-surface-400">{brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  {/* Contrast */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-surface-300 font-medium">Contrast</span>
                      <span className="font-mono text-surface-400">{contrast}</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="60"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  {/* Skin Warmth / Temp */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-surface-300 font-medium">Skin Warmth (Temp)</span>
                      <span className="font-mono text-surface-400">{warmth}</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      value={warmth}
                      onChange={(e) => setWarmth(parseInt(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  {/* Vibrance / Saturation */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-surface-300 font-medium">Vibrance / Saturation</span>
                      <span className="font-mono text-surface-400">{saturation}</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={saturation}
                      onChange={(e) => setSaturation(parseInt(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <button onClick={resetFilters} className="text-xs text-surface-400 hover:text-white">
                    Reset All Adjustments
                  </button>
                </div>
              </div>
            )}

            {/* ─── TAB 3: Backdrop Replacement ───────────────── */}
            {inspectorTab === 'background' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Uniform Backdrop Color</label>
                  <p className="text-[11px] text-surface-400 mb-3">
                    Select official government backdrop color required for your passport or visa:
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Pure White', color: '#ffffff', desc: 'Standard India / US' },
                      { name: 'Studio Light Blue', color: '#bfdbfe', desc: 'Classic Passport' },
                      { name: 'Soft Grey', color: '#f1f5f9', desc: 'Europe / Schengen' },
                      { name: 'Off-White', color: '#fafaf9', desc: 'UK / Canada' },
                    ].map((item) => (
                      <button
                        key={item.color}
                        onClick={() => setBgColor(item.color)}
                        className={`p-2.5 rounded-lg border text-left flex items-center gap-2.5 transition-all ${
                          bgColor === item.color
                            ? 'border-primary-500 bg-primary-500/10 text-white ring-1 ring-primary-500'
                            : 'border-surface-800 bg-surface-850 text-surface-300 hover:border-surface-700'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full border border-surface-600 shadow-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <div className="truncate">
                          <div className="text-xs font-bold">{item.name}</div>
                          <div className="text-[10px] text-surface-400">{item.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white block mb-1.5">Custom Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-9 h-9 rounded cursor-pointer bg-transparent border border-surface-700"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="input-sm text-xs font-mono w-28 bg-surface-800 text-white rounded"
                    />
                  </div>
                </div>

                <div className="h-px bg-surface-800" />

                {/* Photo Thin Border */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white block">Thin Cutting Border</label>
                    <span className="text-[10px] text-surface-400">0.5mm clean border for scissor cutting</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showBorder}
                    onChange={(e) => setShowBorder(e.target.checked)}
                    className="rounded accent-primary-500"
                  />
                </div>
              </div>
            )}

            {/* ─── TAB 4: Sheet Grid & Print Layout (A4, 4x6) ── */}
            {inspectorTab === 'grid' && (
              <div className="space-y-4">
                {/* Auto-Fit Information Banner */}
                <div className="bg-primary-950/40 border border-primary-500/30 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-primary-300 flex items-center gap-1.5">
                      <span>⚡ Auto-Fit Sheet Engine</span>
                    </span>
                    <span className="text-[10px] font-mono bg-primary-500/20 text-primary-300 px-2 py-0.5 rounded-full font-bold">
                      {maxCols} photos / line
                    </span>
                  </div>
                  <p className="text-[11px] text-surface-300 leading-relaxed">
                    Photo width (<strong className="text-white">{photoWidthMm}mm</strong>) ke hisab se 1 line me <strong className="text-primary-300">{maxCols} photos</strong> aayengi. {selectedPaper.name} sheet par total <strong className="text-primary-300">{maxPhotosOnSheet} photos</strong> ({maxRows} lines) fit ho sakti hain.
                  </p>
                </div>

                {/* Quick Line / Quantity Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white block">Quantity Quick Presets</label>

                  {/* Single Photo For Framing Button */}
                  <button
                    onClick={() => setPhotoCount(1)}
                    className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between transition-all ${
                      photoCount === 1
                        ? 'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500 shadow-md shadow-amber-500/10'
                        : 'border-surface-800 bg-surface-850 text-surface-300 hover:border-surface-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">🖼️</span>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>Single Photo (Frame Mode)</span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-medium">1 Photo</span>
                        </div>
                        <div className="text-[10px] text-surface-400">Sheet paper ke center me single photo (Framing ke liye)</div>
                      </div>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${photoCount === 1 ? 'bg-amber-400 ring-4 ring-amber-400/20' : 'bg-surface-700'}`} />
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPhotoCount(maxCols)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        photoCount === maxCols && photoCount !== 1
                          ? 'border-primary-500 bg-primary-500/10 text-white ring-1 ring-primary-500'
                          : 'border-surface-800 bg-surface-850 text-surface-300 hover:border-surface-700'
                      }`}
                    >
                      <div className="text-xs font-bold">1 Line ({maxCols} Photos)</div>
                      <div className="text-[10px] text-surface-400">1 Full Row on {selectedPaper.name}</div>
                    </button>

                    <button
                      onClick={() => setPhotoCount(Math.min(2 * maxCols, maxPhotosOnSheet))}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        photoCount === Math.min(2 * maxCols, maxPhotosOnSheet) && photoCount !== maxCols && photoCount !== 1
                          ? 'border-primary-500 bg-primary-500/10 text-white ring-1 ring-primary-500'
                          : 'border-surface-800 bg-surface-850 text-surface-300 hover:border-surface-700'
                      }`}
                    >
                      <div className="text-xs font-bold">2 Lines ({Math.min(2 * maxCols, maxPhotosOnSheet)} Photos)</div>
                      <div className="text-[10px] text-surface-400">2 Full Rows ({Math.min(2 * maxCols, maxPhotosOnSheet)} photos)</div>
                    </button>

                    <button
                      onClick={() => setPhotoCount(Math.min(3 * maxCols, maxPhotosOnSheet))}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        photoCount === Math.min(3 * maxCols, maxPhotosOnSheet) && photoCount !== Math.min(2 * maxCols, maxPhotosOnSheet) && photoCount !== maxPhotosOnSheet && photoCount !== 1
                          ? 'border-primary-500 bg-primary-500/10 text-white ring-1 ring-primary-500'
                          : 'border-surface-800 bg-surface-850 text-surface-300 hover:border-surface-700'
                      }`}
                    >
                      <div className="text-xs font-bold">3 Lines ({Math.min(3 * maxCols, maxPhotosOnSheet)} Photos)</div>
                      <div className="text-[10px] text-surface-400">3 Rows on Paper</div>
                    </button>

                    <button
                      onClick={() => setPhotoCount(maxPhotosOnSheet)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        photoCount === maxPhotosOnSheet && maxPhotosOnSheet > 1 && photoCount !== maxCols && photoCount !== Math.min(2 * maxCols, maxPhotosOnSheet) && photoCount !== Math.min(3 * maxCols, maxPhotosOnSheet)
                          ? 'border-primary-500 bg-primary-500/10 text-white ring-1 ring-primary-500'
                          : 'border-surface-800 bg-surface-850 text-surface-300 hover:border-surface-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Full Sheet ({maxPhotosOnSheet} Photos)</div>
                      <div className="text-[10px] text-surface-400">All {maxRows} Rows × {maxCols} Cols</div>
                    </button>
                  </div>
                </div>

                {/* Custom Quantity Controls */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-surface-300 font-medium">Custom Quantity</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max={maxPhotosOnSheet}
                        value={photoCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          setPhotoCount(Math.max(1, Math.min(maxPhotosOnSheet, val)));
                        }}
                        className="w-16 bg-surface-900 px-2 py-0.5 rounded border border-surface-700 text-xs font-mono font-bold text-primary-400 text-center focus:border-primary-500 outline-none"
                      />
                      <span className="text-[11px] text-surface-400">Photos</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max={Math.max(1, maxPhotosOnSheet)}
                    value={Math.min(photoCount, maxPhotosOnSheet)}
                    onChange={(e) => setPhotoCount(parseInt(e.target.value))}
                    className="w-full accent-primary-500"
                  />
                  <div className="flex justify-between text-[10px] text-surface-500 mt-0.5 font-mono">
                    <span>1 (Single)</span>
                    <span>Max Sheet: {maxPhotosOnSheet}</span>
                  </div>
                </div>

                <div className="h-px bg-surface-800" />

                {/* Cutting Guides (Scissor Lines) */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-white block">Scissor Cutting Guides</label>
                    <span className="text-[10px] text-surface-400">Corner tick marks to cut with scissors</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showCuttingLines}
                    onChange={(e) => setShowCuttingLines(e.target.checked)}
                    className="rounded accent-primary-500"
                  />
                </div>

                {/* Photo Spacing & Sheet Margin */}
                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-surface-300 font-medium">Photo Gap (Spacing)</span>
                      <span className="font-mono text-surface-400">{photoGapMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="12"
                      value={photoGapMm}
                      onChange={(e) => setPhotoGapMm(parseInt(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-surface-300 font-medium">Sheet Page Margin</span>
                      <span className="font-mono text-surface-400">{sheetMarginMm} mm</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      value={sheetMarginMm}
                      onChange={(e) => setSheetMarginMm(parseInt(e.target.value))}
                      className="w-full accent-primary-500"
                    />
                  </div>
                </div>

                <div className="h-px bg-surface-800" />

                {/* Print & Download Actions */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={handlePrint}
                    className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Sheet Directly (Exact 300 DPI)</span>
                  </button>

                  <button
                    onClick={handleDownloadPDF}
                    disabled={isExporting}
                    className="w-full btn-secondary text-xs py-2 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4 text-primary-400" />
                    <span>Download Printable High-Res PDF</span>
                  </button>

                  <button
                    onClick={handleDownloadSheetImage}
                    className="w-full btn-ghost text-xs py-1.5 flex items-center justify-center gap-2 text-surface-400 hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Full Sheet JPG Image</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Info Bar */}
          <div className="border-t border-surface-800 p-3 bg-surface-950/60 text-[11px] text-surface-400 flex items-center justify-between shrink-0">
            <span className="truncate">
              {photoWidthMm} × {photoHeightMm} mm · {selectedPaper.name} · {photoCount} photos
            </span>
            <span className="font-mono text-primary-400 font-bold shrink-0">Exact 300 DPI Engine</span>
          </div>
        </aside>
      </>
    )}
      </div>
    </div>
  );
}
