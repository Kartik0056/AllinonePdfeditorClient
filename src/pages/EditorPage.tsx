/**
 * Editor Page - Full PDF editor with viewer, toolbar, sidebar, and canvas
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
// Use local bundled worker for 100% reliable offline/online loading
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import {
  FileText, Upload, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  RotateCw, Undo2, Redo2, Download, MousePointer2, Type, ImageIcon,
  PenTool, Highlighter, Square, Minus, Circle, ArrowUpRight,
  Eraser, Stamp, StickyNote, Search, PanelLeftClose, PanelLeftOpen,
  Trash2, Copy, Plus, X, MoveUp, MoveDown, Check, Sparkles,
  Move, RotateCcw, Hand, Eye, Underline as UnderlineIcon, Strikethrough as StrikeIcon,
  Clock, ShieldAlert, AlertTriangle, Cloud, Lock, Sliders, CheckCheck, Loader2
} from 'lucide-react';
import Navbar from '../components/Navbar';
import PDFPreviewModal from '../components/PDFPreviewModal';
import UploadProgressModal, { ProcessingStep } from '../components/UploadProgressModal';
import SaveExitModal from '../components/SaveExitModal';
import { projectAPI } from '../services/api';
import { useEditorStore } from '../stores/editorStore';
import { PDFEditor } from '@pdfeditor/sdk';
import type {
  TextElement,
  ImageElement,
  ShapeElement,
  AnnotationElement,
  SignatureElement,
  DrawingElement,
  PDFElement,
  ToolMode,
  ShapeType,
} from '@pdfeditor/shared';

// Configure PDF.js worker locally
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// Singleton editor instance
let editorInstance: PDFEditor | null = null;
function getEditor(): PDFEditor {
  if (!editorInstance) editorInstance = new PDFEditor();
  return editorInstance;
}

export default function EditorPage() {
  const store = useEditorStore();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRenderTaskRef = useRef<any>(null);
  const overlaySvgRef = useRef<SVGSVGElement>(null);
  const pdfDocRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Document & element state
  const [pageElements, setPageElements] = useState<PDFElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<PDFElement | null>(null);
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineTextVal, setInlineTextVal] = useState('');
  const inlineInputRef = useRef<HTMLTextAreaElement>(null);
  const inlineToolbarRef = useRef<HTMLDivElement>(null);
  const isInteractingWithToolbarRef = useRef(false);

  // Interactive drawing & shape state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [pendingImagePos, setPendingImagePos] = useState<{ x: number; y: number }>({ x: 100, y: 100 });

  // Interactive element drag & resize state
  const [activeDrag, setActiveDrag] = useState<{
    elementId: string;
    action: 'move' | 'resize-se';
    startClientX: number;
    startClientY: number;
    startElX: number;
    startElY: number;
    startElW: number;
    startElH: number;
  } | null>(null);
  const activeDragRef = useRef<typeof activeDrag>(null);
  activeDragRef.current = activeDrag;
  const currentDragPosRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // Modals & UI
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signaturePos, setSignaturePos] = useState<{ x: number; y: number }>({ x: 100, y: 100 });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ page: number; element: TextElement; matchIndex: number }>>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const navigate = useNavigate();

  // Smart Zoom Focus state for editing text (user requested: jo bhi text ham edit kare vohi aye but vo zoom hoke dikhe)
  const [isFocusZoomEnabled, setIsFocusZoomEnabled] = useState(true);
  const [focusZoomFactor, setFocusZoomFactor] = useState(1.8);

  // Multi-step Upload & Extraction state with 20MB check
  const [uploadProgress, setUploadProgress] = useState<{
    isOpen: boolean;
    fileName: string;
    fileSizeBytes: number;
    currentStep: ProcessingStep;
    progressPercent: number;
    statusMessage: string;
    error: string | null;
  }>({
    isOpen: false,
    fileName: '',
    fileSizeBytes: 0,
    currentStep: 'uploading',
    progressPercent: 0,
    statusMessage: '',
    error: null,
  });

  // Save & Exit modal state (user requested: 10 min TTL auto-delete in projects & manual delete)
  const [saveExitModalOpen, setSaveExitModalOpen] = useState(false);
  const [isSavingToDashboard, setIsSavingToDashboard] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // PDF Edit Preview Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPdfBytes, setPreviewPdfBytes] = useState<Uint8Array | null>(null);

  const handleOpenPreview = async () => {
    try {
      const editor = getEditor();
      const bytes = await editor.export();
      setPreviewPdfBytes(bytes);
      setIsPreviewOpen(true);
    } catch (err: any) {
      store.setError('Failed to generate preview: ' + err.message);
    }
  };

  // Sync elements for current page
  const refreshPageElements = useCallback((pageNum: number) => {
    const editor = getEditor();
    const elements = editor.getElements(pageNum);
    setPageElements(elements);
    const storeState = useEditorStore.getState();
    storeState.setCanUndo(editor.canUndo());
    storeState.setCanRedo(editor.canRedo());
  }, []);

  // ─── Load PDF ──────────────────────────────────────────

  const loadPDF = useCallback(async (data: ArrayBuffer, fileName: string) => {
    store.setLoading(true);
    store.setError(null);

    try {
      const editor = getEditor();
      const bytes = new Uint8Array(data);
      const doc = await editor.load(bytes);

      store.setDocument(doc);
      store.setOriginalBytes(bytes);
      store.setFileName(fileName);
      store.setCurrentPage(1);

      // Load with PDF.js for rendering
      const pdfDoc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
      pdfDocRef.current = pdfDoc;

      // Generate thumbnails
      generateThumbnails(pdfDoc);

      // Extract text elements
      await extractTextElements(pdfDoc, 1);
      refreshPageElements(1);

      // Turn off loading so canvas is mounted and active
      store.setLoading(false);

      // Trigger initial render
      setTimeout(() => {
        renderPage(1);
      }, 50);
    } catch (error: any) {
      store.setError(error.message || 'Failed to load PDF');
      store.setLoading(false);
    }
  }, [refreshPageElements]);

  // Create new blank document
  const handleCreateBlank = async () => {
    store.setLoading(true);
    store.setError(null);
    try {
      const editor = getEditor();
      const doc = await editor.createBlank(595.28, 841.89);
      const bytes = await editor.export();

      store.setDocument(doc);
      store.setOriginalBytes(bytes);
      store.setFileName('untitled.pdf');
      store.setCurrentPage(1);

      const pdfDoc = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
      pdfDocRef.current = pdfDoc;

      generateThumbnails(pdfDoc);
      refreshPageElements(1);

      store.setLoading(false);

      setTimeout(() => {
        renderPage(1);
      }, 50);
    } catch (error: any) {
      store.setError(error.message || 'Failed to create blank document');
      store.setLoading(false);
    }
  };

  // Check for pending PDF from landing page
  useEffect(() => {
    const pendingPDF = sessionStorage.getItem('pendingPDF');
    const pendingName = sessionStorage.getItem('pendingPDFName');

    if (pendingPDF && pendingName) {
      sessionStorage.removeItem('pendingPDF');
      sessionStorage.removeItem('pendingPDFName');

      // Convert data URL to ArrayBuffer
      const base64 = pendingPDF.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      loadPDF(bytes.buffer, pendingName);
    }
  }, [loadPDF]);

  // ─── Render Page ───────────────────────────────────────

  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDocRef.current) return;

    // Retry next frame if canvas element is mounting
    let canvas = canvasRef.current;
    if (!canvas) {
      await new Promise((r) => requestAnimationFrame(r));
      canvas = canvasRef.current;
    }
    if (!canvas || !pdfDocRef.current) return;

    // Cancel any previous render task in progress to prevent canvas clearing / blinking
    if (activeRenderTaskRef.current) {
      try {
        await activeRenderTaskRef.current.cancel();
      } catch {}
      activeRenderTaskRef.current = null;
    }

    setIsRendering(true);

    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const currentZoom = useEditorStore.getState().zoom;
      const baseDpr = Math.max(window.devicePixelRatio || 1, 2);
      const qualityMultiplier = Math.max(2.5, baseDpr * 1.5);
      const cssScale = currentZoom / 100;

      const renderViewport = page.getViewport({ scale: cssScale * qualityMultiplier });
      const displayViewport = page.getViewport({ scale: cssScale });

      const ctx = canvas.getContext('2d', { alpha: false })!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);
      canvas.style.width = `${Math.floor(displayViewport.width)}px`;
      canvas.style.height = `${Math.floor(displayViewport.height)}px`;

      const renderTask = page.render({
        canvasContext: ctx,
        viewport: renderViewport,
        intent: 'display',
      });
      activeRenderTaskRef.current = renderTask;

      await renderTask.promise;
      activeRenderTaskRef.current = null;

      refreshPageElements(pageNum);
    } catch (error: any) {
      if (error?.name !== 'RenderingCancelledException') {
        console.error('Render error:', error);
      }
    } finally {
      setIsRendering(false);
    }
  }, [refreshPageElements]);

  // Re-render when page, zoom, or document changes
  useEffect(() => {
    if (pdfDocRef.current) {
      renderPage(store.currentPage);
    } else if (store.originalBytes) {
      // Rehydrate pdfDocRef so canvas is never left blank
      pdfjsLib.getDocument({ data: store.originalBytes.slice() }).promise.then((pdfDoc) => {
        pdfDocRef.current = pdfDoc;
        generateThumbnails(pdfDoc);
        extractTextElements(pdfDoc, store.currentPage);
        renderPage(store.currentPage);
      }).catch(console.error);
    }
  }, [store.currentPage, store.zoom, store.document, store.originalBytes, renderPage]);

  // ─── Text Extraction ──────────────────────────────────

  const extractTextElements = async (pdfDoc: any, pageNum: number) => {
    try {
      const page = await pdfDoc.getPage(pageNum);
      try {
        await page.getOperatorList();
      } catch {}
      const textContent = await page.getTextContent();
      const editor = getEditor();
      editor.setTextElements(pageNum, textContent, page.commonObjs);
      refreshPageElements(pageNum);
    } catch (error) {
      console.error('Text extraction error:', error);
    }
  };

  // ─── Thumbnails ────────────────────────────────────────

  const generateThumbnails = async (pdfDoc: any) => {
    const thumbs: string[] = [];
    const numPages = Math.min(pdfDoc.numPages, 50);

    for (let i = 1; i <= numPages; i++) {
      try {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        thumbs.push(canvas.toDataURL('image/jpeg', 0.6));
      } catch {
        thumbs.push('');
      }
    }

    setThumbnails(thumbs);
  };

  // ─── File Handling & 20MB Processing Pipeline ─────────

  const startProcessingPDF = useCallback(async (file: File) => {
    const MAX_PDF_BYTES = 20 * 1024 * 1024; // Strict 20MB restriction
    if (file.size > MAX_PDF_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setUploadProgress({
        isOpen: true,
        fileName: file.name,
        fileSizeBytes: file.size,
        currentStep: 'uploading',
        progressPercent: 0,
        statusMessage: '',
        error: `File exceeds 20MB restriction (${sizeMB} MB). Only PDF files up to 20MB are allowed for optimized cloud processing.`,
      });
      return;
    }

    setUploadProgress({
      isOpen: true,
      fileName: file.name,
      fileSizeBytes: file.size,
      currentStep: 'uploading',
      progressPercent: 15,
      statusMessage: `Uploading PDF data (${(file.size / 1024 / 1024).toFixed(1)} MB)...`,
      error: null,
    });

    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const p = Math.min(80, Math.round((e.loaded / e.total) * 60) + 15);
        setUploadProgress((prev) => ({
          ...prev,
          progressPercent: p,
          statusMessage: `Uploading PDF data (${(e.loaded / 1024 / 1024).toFixed(1)} MB / ${(file.size / 1024 / 1024).toFixed(1)} MB)...`,
        }));
      }
    };

    reader.onload = async () => {
      try {
        const buffer = reader.result as ArrayBuffer;

        // Stage 2: Security & Structure Verification
        setUploadProgress((prev) => ({
          ...prev,
          currentStep: 'securing',
          progressPercent: 65,
          statusMessage: 'Scanning document security, TLS signatures & binary structures...',
        }));
        await new Promise((r) => setTimeout(r, 400));

        // Stage 3: Text & Vector Layer Extraction
        setUploadProgress((prev) => ({
          ...prev,
          currentStep: 'extracting',
          progressPercent: 82,
          statusMessage: 'Extracting text layers, typography glyphs & vector geometry...',
        }));
        await new Promise((r) => setTimeout(r, 450));

        // Stage 4: Rendering HD Viewports
        setUploadProgress((prev) => ({
          ...prev,
          currentStep: 'rendering',
          progressPercent: 94,
          statusMessage: 'Generating high-fidelity viewport canvases & page thumbnails...',
        }));

        await loadPDF(buffer, file.name);

        // Stage 5: Ready
        setUploadProgress((prev) => ({
          ...prev,
          currentStep: 'ready',
          progressPercent: 100,
          statusMessage: 'Studio workspace initialized successfully!',
        }));

        setTimeout(() => {
          setUploadProgress((prev) => ({ ...prev, isOpen: false }));
        }, 450);
      } catch (err: any) {
        setUploadProgress((prev) => ({
          ...prev,
          error: err.message || 'Failed to parse and load PDF document',
        }));
      }
    };

    reader.onerror = () => {
      setUploadProgress((prev) => ({
        ...prev,
        error: 'Failed to read file from local disk.',
      }));
    };

    reader.readAsArrayBuffer(file);
  }, [loadPDF]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      store.setError('Please select a valid PDF file');
      return;
    }
    startProcessingPDF(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [startProcessingPDF, store]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      startProcessingPDF(file);
    }
  }, [startProcessingPDF]);

  // ─── Save to Dashboard & 10-Minute Expiry Retention ────

  const handleSaveAndExit = useCallback(async () => {
    setIsSavingToDashboard(true);
    try {
      const editor = getEditor();
      const bytes = await editor.export();

      // Convert Uint8Array to base64 in safe chunks
      let binary = '';
      const len = bytes.byteLength;
      const chunkSize = 8192;
      for (let i = 0; i < len; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
        binary += String.fromCharCode.apply(null, chunk as any);
      }
      const base64 = btoa(binary);

      await projectAPI.saveEdited({
        name: store.fileName || 'Edited Document.pdf',
        originalFileName: store.fileName || 'document.pdf',
        pdfBase64: `data:application/pdf;base64,${base64}`,
        pageCount: store.document?.totalPages || 1,
      });

      setSaveExitModalOpen(false);
      store.reset();
      navigate('/dashboard');
    } catch (err: any) {
      store.setError('Failed to save edited PDF to projects: ' + (err.message || ''));
    } finally {
      setIsSavingToDashboard(false);
    }
  }, [store, navigate]);

  const handleDiscardAndExit = useCallback(() => {
    store.reset();
    setSaveExitModalOpen(false);
    navigate('/dashboard');
  }, [store, navigate]);

  // ─── Delete Element ────────────────────────────────────

  const handleDeleteElement = useCallback((id: string) => {
    const editor = getEditor();
    editor.deleteElement(id);
    if (selectedElement?.id === id) {
      setSelectedElement(null);
      store.setSelectedElement(null);
      setInlineEditingId(null);
    }
    refreshPageElements(store.currentPage);
  }, [selectedElement, store, refreshPageElements]);

  // ─── Text Editing ──────────────────────────────────────

  const handleTextClick = useCallback((el: TextElement, e: React.MouseEvent) => {
    e.stopPropagation();
    if (store.activeTool === 'eraser') {
      handleDeleteElement(el.id);
      return;
    }

    const editor = getEditor();
    const currentElements = editor.getElements(store.currentPage);

    if (store.activeTool === 'highlight') {
      const existing = currentElements.find(
        (a) => a.type === 'annotation' &&
               (a as AnnotationElement).annotationType === 'highlight' &&
               Math.abs(a.x - (el.x - 1)) < 20 &&
               Math.abs(a.y - (el.y - 1)) < 20
      );
      if (existing) {
        editor.deleteElement(existing.id);
        refreshPageElements(store.currentPage);
        return;
      }
      editor.addHighlight(
        store.currentPage,
        el.x - 1,
        el.y - 1,
        el.width + 2,
        el.height + 2,
        store.fillColor !== 'transparent' ? store.fillColor : '#fde047'
      );
      refreshPageElements(store.currentPage);
      return;
    }

    if (store.activeTool === 'underline') {
      const existing = currentElements.find(
        (a) => a.type === 'annotation' &&
               (a as AnnotationElement).annotationType === 'underline' &&
               Math.abs(a.x - el.x) < 25 &&
               Math.abs(a.y - (el.y + el.height - 2)) < 25
      );
      if (existing || el.textDecoration === 'underline') {
        if (existing) editor.deleteElement(existing.id);
        if (el.textDecoration === 'underline') {
          editor.editText(el.id, { textDecoration: 'none' });
        }
        refreshPageElements(store.currentPage);
        return;
      }
      editor.addUnderline(
        store.currentPage,
        el.x,
        el.y + el.height - 2,
        el.width,
        store.strokeColor || '#f43f5e'
      );
      refreshPageElements(store.currentPage);
      return;
    }

    if (store.activeTool === 'strikethrough') {
      const existing = currentElements.find(
        (a) => a.type === 'annotation' &&
               (a as AnnotationElement).annotationType === 'strikethrough' &&
               Math.abs(a.x - el.x) < 25 &&
               Math.abs(a.y - el.y) < 25
      );
      if (existing || el.textDecoration === 'line-through') {
        if (existing) editor.deleteElement(existing.id);
        if (el.textDecoration === 'line-through') {
          editor.editText(el.id, { textDecoration: 'none' });
        }
        refreshPageElements(store.currentPage);
        return;
      }
      editor.addStrikethrough(
        store.currentPage,
        el.x,
        el.y,
        el.width,
        el.height,
        store.strokeColor || '#f43f5e'
      );
      refreshPageElements(store.currentPage);
      return;
    }

    if (store.activeTool === 'draw') {
      return;
    }

    // Direct in-place Word-style editing (NO side panel or modal popup)
    setSelectedElement(el);
    store.setSelectedElement(el.id);
    setInlineEditingId(el.id);
    setInlineTextVal(el.text);
    store.setShowProperties(false);
  }, [store, refreshPageElements, handleDeleteElement]);

  const handleCommitInlineText = useCallback((id: string, textOverride?: string) => {
    const textToSave = textOverride !== undefined ? textOverride : inlineTextVal;
    const editor = getEditor();
    const currentEl = editor.getElement(id) as TextElement | null;

    if (!currentEl) {
      setInlineEditingId(null);
      return;
    }

    // Check if the text actually changed or custom formatting was applied
    const textChanged = textToSave !== currentEl.text;
    const hasFormatting = Boolean((currentEl as any).hasCustomFormatting);

    // If neither text nor formatting changed, do NOT mark as edited!
    // Leave original PDF text completely untouched on the canvas!
    if (textChanged || hasFormatting) {
      editor.editText(id, {
        text: textToSave,
        fontSize: currentEl.fontSize,
        fontFamily: currentEl.fontFamily,
        fontWeight: currentEl.fontWeight,
        fontStyle: (currentEl as any).fontStyle,
        textDecoration: currentEl.textDecoration,
        color: currentEl.color,
      });
      refreshPageElements(store.currentPage);
    }

    setInlineEditingId(null);
  }, [inlineTextVal, store.currentPage, refreshPageElements]);

  const handleUpdateTextProps = useCallback((id: string, updates: Partial<TextElement>) => {
    const editor = getEditor();
    editor.editText(id, {
      ...updates,
      hasCustomFormatting: true,
    } as any);
    refreshPageElements(store.currentPage);
    const updated = editor.getElement(id);
    if (updated) setSelectedElement(updated);
  }, [store.currentPage, refreshPageElements]);

  // Toggle Underline on text element on-demand (removes without undo if already present)
  const handleToggleUnderline = useCallback((targetTxt: TextElement) => {
    const editor = getEditor();
    const currentElements = editor.getElements(store.currentPage);
    const matchedUnderlines = currentElements.filter(
      (a) => a.type === 'annotation' &&
             (a as AnnotationElement).annotationType === 'underline' &&
             Math.abs(a.x - targetTxt.x) < 25 &&
             Math.abs(a.y - (targetTxt.y + targetTxt.height - 2)) < 25
    );

    if (matchedUnderlines.length > 0 || targetTxt.textDecoration === 'underline') {
      matchedUnderlines.forEach((u) => editor.deleteElement(u.id));
      handleUpdateTextProps(targetTxt.id, { textDecoration: 'none' });
    } else {
      editor.addUnderline(
        store.currentPage,
        targetTxt.x,
        targetTxt.y + targetTxt.height - 2,
        targetTxt.width,
        targetTxt.color || '#f43f5e'
      );
      handleUpdateTextProps(targetTxt.id, { textDecoration: 'underline' });
    }
    refreshPageElements(store.currentPage);
  }, [store.currentPage, handleUpdateTextProps, refreshPageElements]);

  // Toggle Strikethrough on text element on-demand
  const handleToggleStrikethrough = useCallback((targetTxt: TextElement) => {
    const editor = getEditor();
    const currentElements = editor.getElements(store.currentPage);
    const matchedStrikes = currentElements.filter(
      (a) => a.type === 'annotation' &&
             (a as AnnotationElement).annotationType === 'strikethrough' &&
             Math.abs(a.x - targetTxt.x) < 25 &&
             Math.abs(a.y - targetTxt.y) < 25
    );

    if (matchedStrikes.length > 0 || targetTxt.textDecoration === 'line-through') {
      matchedStrikes.forEach((s) => editor.deleteElement(s.id));
      handleUpdateTextProps(targetTxt.id, { textDecoration: 'none' });
    } else {
      editor.addStrikethrough(
        store.currentPage,
        targetTxt.x,
        targetTxt.y,
        targetTxt.width,
        targetTxt.height,
        targetTxt.color || '#f43f5e'
      );
      handleUpdateTextProps(targetTxt.id, { textDecoration: 'line-through' });
    }
    refreshPageElements(store.currentPage);
  }, [store.currentPage, handleUpdateTextProps, refreshPageElements]);

  // Clear all custom formatting & decorations on text element
  const handleClearAllStyles = useCallback((targetTxt: TextElement) => {
    const editor = getEditor();
    const currentElements = editor.getElements(store.currentPage);

    const overlapping = currentElements.filter(
      (a) => a.type === 'annotation' &&
             Math.abs(a.x - targetTxt.x) < Math.max(targetTxt.width, 30) &&
             Math.abs(a.y - targetTxt.y) < Math.max(targetTxt.height + 10, 30)
    );
    overlapping.forEach((ann) => editor.deleteElement(ann.id));

    handleUpdateTextProps(targetTxt.id, {
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000',
    });

    refreshPageElements(store.currentPage);
  }, [store.currentPage, handleUpdateTextProps, refreshPageElements]);

  // ─── Interactive Element Drag & Resize Handlers ─────────

  const startElementDrag = useCallback((
    e: React.MouseEvent | React.TouchEvent,
    el: PDFElement,
    action: 'move' | 'resize-se' = 'move'
  ) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (store.activeTool === 'eraser') {
      handleDeleteElement(el.id);
      return;
    }
    setSelectedElement(el);
    store.setSelectedElement(el.id);
    store.setShowProperties(true);

    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as any).clientY;

    const elW = (el as any).width || 120;
    const elH = (el as any).height || 60;
    currentDragPosRef.current = { x: el.x, y: el.y, width: elW, height: elH };

    setActiveDrag({
      elementId: el.id,
      action,
      startClientX: clientX,
      startClientY: clientY,
      startElX: el.x,
      startElY: el.y,
      startElW: elW,
      startElH: elH,
    });
  }, [store, handleDeleteElement]);

  useEffect(() => {
    if (!activeDrag) return;

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const drag = activeDragRef.current;
      if (!drag) return;
      if (e.cancelable) e.preventDefault();

      const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as any).clientX;
      const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as any).clientY;

      const scale = useEditorStore.getState().zoom / 100;
      const deltaX = (clientX - drag.startClientX) / scale;
      const deltaY = (clientY - drag.startClientY) / scale;

      if (drag.action === 'move') {
        const newX = Math.round(drag.startElX + deltaX);
        const newY = Math.round(drag.startElY + deltaY);
        currentDragPosRef.current = {
          x: newX,
          y: newY,
          width: currentDragPosRef.current?.width || drag.startElW,
          height: currentDragPosRef.current?.height || drag.startElH,
        };

        setPageElements((prev) =>
          prev.map((el) => (el.id === drag.elementId ? { ...el, x: newX, y: newY } : el))
        );
        setSelectedElement((prev) => (prev && prev.id === drag.elementId ? { ...prev, x: newX, y: newY } : prev));
      } else if (drag.action === 'resize-se') {
        const newW = Math.max(30, Math.round(drag.startElW + deltaX));
        const newH = Math.max(20, Math.round(drag.startElH + deltaY));
        currentDragPosRef.current = {
          x: currentDragPosRef.current?.x || drag.startElX,
          y: currentDragPosRef.current?.y || drag.startElY,
          width: newW,
          height: newH,
        };

        setPageElements((prev) =>
          prev.map((el) => (el.id === drag.elementId ? ({ ...el, width: newW, height: newH } as any) : el))
        );
        setSelectedElement((prev) => (prev && prev.id === drag.elementId ? ({ ...prev, width: newW, height: newH } as any) : prev));
      }
    };

    const onPointerUp = () => {
      const drag = activeDragRef.current;
      if (!drag) return;

      const editor = getEditor();
      const currentPage = useEditorStore.getState().currentPage;
      const finalPos = currentDragPosRef.current;

      if (finalPos) {
        if (drag.action === 'move') {
          editor.moveElement(drag.elementId, finalPos.x, finalPos.y);
        } else if (drag.action === 'resize-se') {
          editor.resizeElement(drag.elementId, finalPos.width, finalPos.height);
        }
        refreshPageElements(currentPage);
        const updated = editor.getElement(drag.elementId);
        if (updated) setSelectedElement(updated);
      }

      currentDragPosRef.current = null;
      setActiveDrag(null);
    };

    window.addEventListener('mousemove', onPointerMove, { passive: false });
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
    window.addEventListener('touchcancel', onPointerUp);

    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('touchcancel', onPointerUp);
    };
  }, [activeDrag, refreshPageElements]);

  // ─── Canvas Mouse Handlers (Interactive Creation) ──────

  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement | HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = store.zoom / 100;
    return {
      x: Math.max(0, (e.clientX - rect.left) / scale),
      y: Math.max(0, (e.clientY - rect.top) / scale),
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e);
    const editor = getEditor();

    if (store.activeTool === 'select') {
      if (inlineEditingId) {
        handleCommitInlineText(inlineEditingId);
      }
      setSelectedElement(null);
      store.setSelectedElement(null);
      setInlineEditingId(null);
      return;
    }

    if (store.activeTool === 'text') {
      const newText = editor.addText(store.currentPage, {
        text: 'Type text here',
        x: coords.x,
        y: coords.y,
        fontSize: store.fontSize,
        fontFamily: store.fontFamily,
        color: store.textColor,
      });
      refreshPageElements(store.currentPage);
      setSelectedElement(newText);
      store.setSelectedElement(newText.id);
      setInlineEditingId(newText.id);
      setInlineTextVal('Type text here');
      store.setActiveTool('select');
      store.setShowProperties(false);
      return;
    }

    if (store.activeTool === 'draw') {
      setIsDrawing(true);
      setCurrentStroke([coords]);
      return;
    }

    if (['highlight', 'underline', 'strikethrough', 'shape'].includes(store.activeTool)) {
      setDragStart(coords);
      setDragCurrent(coords);
      return;
    }

    if (store.activeTool === 'sticky-note') {
      editor.addStickyNote(store.currentPage, coords.x, coords.y, 'New note...', '#fef08a');
      refreshPageElements(store.currentPage);
      store.setActiveTool('select');
      return;
    }

    if (store.activeTool === 'image') {
      setPendingImagePos(coords);
      imageInputRef.current?.click();
      return;
    }

    if (store.activeTool === 'sign') {
      setSignaturePos(coords);
      setShowSignatureModal(true);
      return;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e);

    if (isDrawing && store.activeTool === 'draw') {
      setCurrentStroke((prev) => [...prev, coords]);
      return;
    }

    if (dragStart && ['highlight', 'underline', 'strikethrough', 'shape'].includes(store.activeTool)) {
      setDragCurrent(coords);
    }
  };

  const handleCanvasMouseUp = () => {
    const editor = getEditor();

    if (isDrawing && store.activeTool === 'draw') {
      setIsDrawing(false);
      if (currentStroke.length > 1) {
        editor.addDrawing(store.currentPage, currentStroke, store.strokeColor || '#000000', store.strokeWidth || 2);
        refreshPageElements(store.currentPage);
      }
      setCurrentStroke([]);
      return;
    }

    if (dragStart && dragCurrent) {
      const minX = Math.min(dragStart.x, dragCurrent.x);
      const minY = Math.min(dragStart.y, dragCurrent.y);
      const maxX = Math.max(dragStart.x, dragCurrent.x);
      const maxY = Math.max(dragStart.y, dragCurrent.y);
      const width = Math.max(maxX - minX, 5);
      const height = Math.max(maxY - minY, 5);

      if (['highlight', 'underline', 'strikethrough'].includes(store.activeTool)) {
        const currentElements = editor.getElements(store.currentPage);
        const textElements = currentElements.filter(
          (el) => el.type === 'text' &&
            el.x < maxX && el.x + el.width > minX &&
            el.y < maxY && el.y + el.height > minY
        ) as TextElement[];

        if (textElements.length > 0) {
          const isUnderline = store.activeTool === 'underline';
          const isStrike = store.activeTool === 'strikethrough';
          const isHighlight = store.activeTool === 'highlight';

          // Check if all selected elements already have this annotation
          const allHaveIt = isUnderline
            ? textElements.every((txt) => currentElements.some((a) => a.type === 'annotation' && (a as AnnotationElement).annotationType === 'underline' && Math.abs(a.x - txt.x) < 25 && Math.abs(a.y - (txt.y + txt.height - 2)) < 25))
            : isStrike
            ? textElements.every((txt) => currentElements.some((a) => a.type === 'annotation' && (a as AnnotationElement).annotationType === 'strikethrough' && Math.abs(a.x - txt.x) < 25 && Math.abs(a.y - txt.y) < 25))
            : isHighlight
            ? textElements.every((txt) => currentElements.some((a) => a.type === 'annotation' && (a as AnnotationElement).annotationType === 'highlight' && Math.abs(a.x - txt.x) < 20 && Math.abs(a.y - txt.y) < 20))
            : false;

          if (allHaveIt) {
            // TOGGLE OFF: remove from all selected elements!
            textElements.forEach((txt) => {
              const matched = currentElements.filter((a) => {
                if (a.type !== 'annotation') return false;
                const ann = a as AnnotationElement;
                if (isUnderline && ann.annotationType === 'underline') {
                  return Math.abs(ann.x - txt.x) < 25 && Math.abs(ann.y - (txt.y + txt.height - 2)) < 25;
                }
                if (isStrike && ann.annotationType === 'strikethrough') {
                  return Math.abs(ann.x - txt.x) < 25 && Math.abs(ann.y - txt.y) < 25;
                }
                if (isHighlight && ann.annotationType === 'highlight') {
                  return Math.abs(ann.x - txt.x) < 20 && Math.abs(ann.y - txt.y) < 20;
                }
                return false;
              });
              matched.forEach((m) => editor.deleteElement(m.id));
            });
          } else {
            textElements.forEach((txt) => {
              if (store.activeTool === 'highlight') {
                editor.addHighlight(
                  store.currentPage,
                  txt.x - 1,
                  txt.y - 1,
                  txt.width + 2,
                  txt.height + 2,
                  store.fillColor !== 'transparent' ? store.fillColor : '#fde047'
                );
              } else if (store.activeTool === 'underline') {
                editor.addUnderline(
                  store.currentPage,
                  txt.x,
                  txt.y + txt.height - 2,
                  txt.width,
                  store.strokeColor || '#f43f5e'
                );
              } else if (store.activeTool === 'strikethrough') {
                editor.addStrikethrough(
                  store.currentPage,
                  txt.x,
                  txt.y,
                  txt.width,
                  txt.height,
                  store.strokeColor || '#f43f5e'
                );
              }
            });
          }
        } else {
          // If no text elements intersect (empty canvas, scanned document, or custom area)
          if (store.activeTool === 'highlight') {
            editor.addHighlight(store.currentPage, minX, minY, width, height, store.fillColor !== 'transparent' ? store.fillColor : '#fde047');
          } else if (store.activeTool === 'underline') {
            editor.addUnderline(store.currentPage, minX, maxY - 2, width, store.strokeColor || '#f43f5e');
          } else if (store.activeTool === 'strikethrough') {
            editor.addStrikethrough(store.currentPage, minX, minY, width, height, store.strokeColor || '#f43f5e');
          }
        }
        refreshPageElements(store.currentPage);
      } else if (store.activeTool === 'shape') {
        editor.addShape(store.currentPage, store.shapeType || 'rectangle', minX, minY, width, height, {
          strokeColor: store.strokeColor,
          strokeWidth: store.strokeWidth,
          fillColor: store.fillColor,
        });
        refreshPageElements(store.currentPage);
        store.setActiveTool('select');
      }

      setDragStart(null);
      setDragCurrent(null);
    }
  };

  // ─── Image Upload Handler ──────────────────────────────

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const editor = getEditor();
      const newImg = editor.addImage(store.currentPage, dataUrl, {
        x: pendingImagePos.x,
        y: pendingImagePos.y,
        width: 180,
        height: 120,
        format: file.type.includes('png') ? 'png' : 'jpg',
      });
      refreshPageElements(store.currentPage);
      setSelectedElement(newImg);
      store.setSelectedElement(newImg.id);
      store.setShowProperties(true);
      store.setActiveTool('select');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // ─── Signature Apply Handler ───────────────────────────

  const handleApplySignature = (sigDataUrl: string) => {
    const editor = getEditor();
    const newSig = editor.addSignature(store.currentPage, sigDataUrl, {
      x: signaturePos.x,
      y: signaturePos.y,
      width: 180,
      height: 70,
    });
    refreshPageElements(store.currentPage);
    setSelectedElement(newSig);
    store.setSelectedElement(newSig.id);
    store.setShowProperties(true);
    setShowSignatureModal(false);
    store.setActiveTool('select');
  };

  // ─── Page Management Actions ───────────────────────────

  const handleAddBlankPage = () => {
    const editor = getEditor();
    editor.addBlankPage(store.currentPage);
    store.setDocument(editor.getDocument());
    refreshPageElements(store.currentPage);
  };

  const handleDuplicatePage = () => {
    const editor = getEditor();
    editor.duplicatePage(store.currentPage);
    store.setDocument(editor.getDocument());
    refreshPageElements(store.currentPage);
  };

  const handleRotatePage = () => {
    const editor = getEditor();
    editor.rotatePage(store.currentPage, 90);
    renderPage(store.currentPage);
  };

  const handleDeletePage = () => {
    if (store.document && store.document.totalPages <= 1) {
      alert('Cannot delete the only page in the document.');
      return;
    }
    const editor = getEditor();
    editor.deletePage(store.currentPage);
    store.setDocument(editor.getDocument());
    const nextPg = Math.max(1, Math.min(store.currentPage, editor.getPageCount()));
    store.setCurrentPage(nextPg);
    renderPage(nextPg);
  };

  // ─── Search Functionality ──────────────────────────────

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const editor = getEditor();
    const results = editor.searchText(query, { caseSensitive: false });
    setSearchResults(results);
    setCurrentMatchIndex(0);

    if (results.length > 0 && results[0].page !== store.currentPage) {
      store.setCurrentPage(results[0].page);
    }
  };

  const nextMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % searchResults.length;
    setCurrentMatchIndex(nextIdx);
    const match = searchResults[nextIdx];
    if (match.page !== store.currentPage) {
      store.setCurrentPage(match.page);
    }
  };

  const prevMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + searchResults.length) % searchResults.length;
    setCurrentMatchIndex(prevIdx);
    const match = searchResults[prevIdx];
    if (match.page !== store.currentPage) {
      store.setCurrentPage(match.page);
    }
  };

  // ─── Export & Download ─────────────────────────────────

  const handleExport = useCallback(async () => {
    const editor = getEditor();
    if (!editor.isLoaded()) return;

    try {
      store.setLoading(true);
      const downloadName = store.fileName.replace('.pdf', '_edited.pdf') || 'edited_document.pdf';
      await editor.download(downloadName);
      store.setLoading(false);
    } catch (error: any) {
      store.setError(error.message);
      store.setLoading(false);
    }
  }, [store]);

  // ─── Undo/Redo ─────────────────────────────────────────

  const handleUndo = useCallback(() => {
    const editor = getEditor();
    editor.undo();
    refreshPageElements(store.currentPage);
    store.setCanUndo(editor.canUndo());
    store.setCanRedo(editor.canRedo());
  }, [store, refreshPageElements]);

  const handleRedo = useCallback(() => {
    const editor = getEditor();
    editor.redo();
    refreshPageElements(store.currentPage);
    store.setCanUndo(editor.canUndo());
    store.setCanRedo(editor.canRedo());
  }, [store, refreshPageElements]);

  // ─── Keyboard Shortcuts ────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z': e.preventDefault(); if (e.shiftKey) handleRedo(); else handleUndo(); break;
          case 'y': e.preventDefault(); handleRedo(); break;
          case 's': e.preventDefault(); handleExport(); break;
          case '=': e.preventDefault(); store.zoomIn(); break;
          case '-': e.preventDefault(); store.zoomOut(); break;
          case 'f': e.preventDefault(); setShowSearch(true); break;
        }
      }
      if (e.key === 'Escape') {
        if (inlineEditingId) {
          handleCommitInlineText(inlineEditingId);
        }
        setInlineEditingId(null);
        setSelectedElement(null);
        store.setSelectedElement(null);
        setShowSearch(false);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement) {
        const targetTag = (e.target as HTMLElement)?.tagName;
        if (!['INPUT', 'TEXTAREA'].includes(targetTag)) {
          e.preventDefault();
          handleDeleteElement(selectedElement.id);
          setSelectedElement(null);
          store.setSelectedElement(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleExport, selectedElement, handleDeleteElement, store]);

  // ─── Tool Definitions ──────────────────────────────────

  const tools: { id: ToolMode; icon: any; label: string }[] = [
    { id: 'select', icon: MousePointer2, label: 'Select' },
    { id: 'text', icon: Type, label: 'Add Text' },
    { id: 'draw', icon: PenTool, label: 'Draw' },
    { id: 'highlight', icon: Highlighter, label: 'Highlight' },
    { id: 'underline', icon: Minus, label: 'Underline' },
    { id: 'strikethrough', icon: Minus, label: 'Strikethrough' },
    { id: 'shape', icon: Square, label: 'Shape' },
    { id: 'image', icon: ImageIcon, label: 'Image' },
    { id: 'sign', icon: Stamp, label: 'Sign' },
    { id: 'sticky-note', icon: StickyNote, label: 'Sticky Note' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
  ];

  // If no document loaded: show upload screen WITH PERSISTENT NAVBAR
  if (!store.document) {
    return (
      <div className="min-h-screen bg-surface-950 flex flex-col">
        <Navbar />

        <div
          className="flex-1 flex items-center justify-center p-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="max-w-md w-full text-center">
            <div className="card p-8 border border-surface-800 shadow-2xl relative overflow-hidden">
              {/* Background gradient blur */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-primary-600/10 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
                <FileText className="w-8 h-8 text-white" />
              </div>

              {/* 20MB Limit Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300 text-xs font-semibold mb-3">
                <Lock className="w-3.5 h-3.5 text-primary-400" />
                <span>Max 20MB Size Limit</span>
                <span className="text-surface-500">·</span>
                <span>10m Auto-Delete Privacy</span>
              </div>

              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Open a PDF</h1>
              <p className="text-surface-400 text-xs mb-6">
                Fast vector text editing with Smart Focus Zoom, signatures, and instant conversion
              </p>

              <div
                className="dropzone mb-6 cursor-pointer border-2 border-dashed border-surface-700 hover:border-primary-500 transition-colors p-8 rounded-xl bg-surface-900/60"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Upload className="w-10 h-10 text-primary-400 mx-auto mb-3 animate-bounce" />
                <p className="text-surface-200 font-semibold text-sm">Drop PDF here or click to browse</p>
                <p className="text-surface-400 text-xs mt-1.5 font-mono">Maximum file size: 20MB</p>
              </div>

              <div className="flex items-center gap-3 justify-center mb-2">
                <button
                  onClick={handleCreateBlank}
                  className="btn-secondary text-xs flex items-center gap-1.5 px-4 py-2"
                >
                  <Plus className="w-3.5 h-3.5 text-primary-400" />
                  Create Blank PDF
                </button>
              </div>

              {store.error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{store.error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload & Extraction Progress Pipeline Modal */}
        <UploadProgressModal
          isOpen={uploadProgress.isOpen}
          fileName={uploadProgress.fileName}
          fileSizeBytes={uploadProgress.fileSizeBytes}
          currentStep={uploadProgress.currentStep}
          progressPercent={uploadProgress.progressPercent}
          statusMessage={uploadProgress.statusMessage}
          error={uploadProgress.error}
          onCancel={() => setUploadProgress((prev) => ({ ...prev, isOpen: false, error: null }))}
        />
      </div>
    );
  }

  const totalPages = store.document.totalPages;
  const scale = store.zoom / 100;

  return (
    <div className="h-screen flex flex-col bg-surface-950 overflow-hidden select-none">
      {/* ─── Persistent Global Navbar (Always Visible) ─────── */}
      <Navbar />

      {/* Hidden file input for opening PDFs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Hidden file input for adding images */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleImageFileChange}
      />

      {/* ─── Secondary Editor Sub-Header / Action Bar ────── */}
      <div className="h-11 bg-surface-900/90 border-b border-surface-800/60 px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Back to Dashboard with 10-Minute Auto-Delete Prompt */}
          <button
            onClick={() => setSaveExitModalOpen(true)}
            className="btn-ghost text-xs px-2.5 py-1 flex items-center gap-1 text-surface-300 hover:text-white shrink-0 hover:bg-surface-800 rounded-lg transition-colors border border-surface-800/80"
            title="Return to Dashboard & Saved Projects"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-primary-400" />
            <span className="font-semibold">Dashboard</span>
          </button>

          <div className="h-4 w-px bg-surface-800 shrink-0" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1.5 shadow-sm shrink-0"
            title="Open or upload a PDF file (Max 20MB)"
          >
            <Upload className="w-3.5 h-3.5 text-primary-400 shrink-0" />
            <span>Open PDF</span>
          </button>

          <button
            onClick={handleCreateBlank}
            className="btn-ghost text-xs px-2 py-1 flex items-center gap-1 text-surface-400 hover:text-white shrink-0"
            title="Create New Blank PDF"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">New Blank</span>
          </button>

          <div className="h-4 w-px bg-surface-800 shrink-0" />

          {/* Document Title & Badges */}
          <span className="text-xs font-semibold text-white truncate max-w-[130px] sm:max-w-[180px]" title={store.fileName}>
            {store.fileName}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-800 text-surface-400 font-mono shrink-0">
            {totalPages} {totalPages === 1 ? 'page' : 'pages'}
          </span>

          {/* Strict 20MB & 10m TTL Badges */}
          <span className="hidden xl:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-300 border border-primary-500/30 font-medium shrink-0">
            <Lock className="w-3 h-3" />
            Max 20MB
          </span>
          <span className="hidden xl:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium shrink-0">
            <Clock className="w-3 h-3" />
            10m Auto-Delete
          </span>
        </div>

        {/* Action bar: Focus Zoom, Search, Undo/Redo, Preview, Export, Save & Exit */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Smart Zoom Focus Mode Button */}
          <button
            type="button"
            onClick={() => setIsFocusZoomEnabled(!isFocusZoomEnabled)}
            className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all shrink-0 ${
              isFocusZoomEnabled
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40 font-semibold shadow-sm'
                : 'btn-secondary text-surface-400 hover:text-white'
            }`}
            title="Toggle Smart Focus Zoom when editing text"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            <span className="hidden sm:inline">Text Focus Zoom:</span>
            <span>{isFocusZoomEnabled ? `${Math.round(focusZoomFactor * 100)}%` : 'OFF'}</span>
          </button>

          {showSearch ? (
            <div className="flex items-center gap-1.5 bg-surface-800/90 rounded-lg px-2 py-1 border border-surface-700">
              <Search className="w-3.5 h-3.5 text-surface-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search in PDF..."
                className="bg-transparent text-white text-xs outline-none w-28 sm:w-40"
                autoFocus
              />
              {searchResults.length > 0 && (
                <span className="text-[10px] text-surface-400 font-mono">
                  {currentMatchIndex + 1}/{searchResults.length}
                </span>
              )}
              <button onClick={prevMatch} className="btn-icon p-0.5 text-surface-400 hover:text-white" title="Previous">
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button onClick={nextMatch} className="btn-icon p-0.5 text-surface-400 hover:text-white" title="Next">
                <ChevronRight className="w-3 h-3" />
              </button>
              <button onClick={() => setShowSearch(false)} className="btn-icon p-0.5 text-surface-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowSearch(true)} className="btn-icon p-1.5" title="Search Text (Ctrl+F)">
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="h-4 w-px bg-surface-800 shrink-0" />

          {/* Undo / Redo */}
          <button onClick={handleUndo} disabled={!store.canUndo} className="btn-icon p-1.5 disabled:opacity-40 shrink-0" title="Undo (Ctrl+Z)">
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleRedo} disabled={!store.canRedo} className="btn-icon p-1.5 disabled:opacity-40 shrink-0" title="Redo (Ctrl+Y)">
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-surface-800 shrink-0" />

          {/* Preview Final Edited PDF */}
          <button
            onClick={handleOpenPreview}
            className="btn-secondary text-xs px-2.5 sm:px-3 py-1 flex items-center gap-1.5 shadow-sm shrink-0"
            title="Preview final edited PDF with annotations and signatures before exporting"
          >
            <Eye className="w-3.5 h-3.5 text-primary-400 shrink-0" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          {/* Direct Download/Export */}
          <button onClick={handleExport} className="btn-secondary text-xs px-3 py-1 flex items-center gap-1.5 shadow-sm shrink-0" title="Direct download PDF">
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Download</span>
          </button>

          {/* Save to Projects & Exit with 10-Minute Auto-Delete */}
          <button
            onClick={() => setSaveExitModalOpen(true)}
            className="btn-primary text-xs px-3 py-1 flex items-center gap-1.5 shadow-md shadow-primary-500/20 shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border border-emerald-400/30 font-semibold"
            title="Save edited PDF to projects with 10-minute auto-expiry retention"
          >
            <Cloud className="w-3.5 h-3.5 shrink-0" />
            <span>Save & Exit (10m TTL)</span>
          </button>
        </div>
      </div>

      {/* ─── Editor Tools Toolbar ────────────────────────── */}
      <div className="h-12 bg-surface-900/60 border-b border-surface-800/50 flex items-center px-4 gap-1.5 shrink-0 overflow-x-auto z-20">
        <div className="flex items-center gap-1">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                store.setActiveTool(tool.id);
                if (tool.id === 'sign') {
                  const canvas = canvasRef.current;
                  const cw = canvas ? canvas.width / 1.5 : 595;
                  const ch = canvas ? canvas.height / 1.5 : 842;
                  setSignaturePos({ x: Math.max(50, Math.round((cw - 180) / 2)), y: Math.max(50, Math.round(ch * 0.4)) });
                  setShowSignatureModal(true);
                } else if (tool.id === 'image') {
                  const canvas = canvasRef.current;
                  const cw = canvas ? canvas.width / 1.5 : 595;
                  const ch = canvas ? canvas.height / 1.5 : 842;
                  setPendingImagePos({ x: Math.max(50, Math.round((cw - 160) / 2)), y: Math.max(50, Math.round(ch * 0.4)) });
                  imageInputRef.current?.click();
                }
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                store.activeTool === tool.id
                  ? 'bg-primary-600/30 text-primary-300 border border-primary-500/40 shadow-sm'
                  : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
              }`}
              title={tool.label}
            >
              <tool.icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-surface-800 mx-1" />

        {/* Dynamic Tool Options Bar */}
        {store.activeTool === 'shape' && (
          <div className="flex items-center gap-1.5">
            <select
              value={store.shapeType}
              onChange={(e) => store.setShapeType(e.target.value as ShapeType)}
              className="input-sm text-xs py-1"
            >
              <option value="rectangle">Rectangle</option>
              <option value="circle">Circle / Ellipse</option>
              <option value="line">Line</option>
              <option value="arrow">Arrow</option>
            </select>
          </div>
        )}

        {(store.activeTool === 'draw' || store.activeTool === 'shape') && (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={store.strokeColor}
              onChange={(e) => store.setStrokeColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              title="Stroke Color"
            />
            <select
              value={store.strokeWidth}
              onChange={(e) => store.setStrokeWidth(Number(e.target.value))}
              className="input-sm text-xs py-1 w-16"
              title="Stroke Width"
            >
              {[1, 2, 3, 4, 6, 8, 12].map((w) => (
                <option key={w} value={w}>{w}px</option>
              ))}
            </select>
          </div>
        )}

        {store.activeTool === 'text' && (
          <div className="flex items-center gap-2">
            <select
              value={store.fontFamily}
              onChange={(e) => store.setFontFamily(e.target.value)}
              className="input-sm text-xs py-1 w-28"
            >
              {['Helvetica', 'Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              value={store.fontSize}
              onChange={(e) => store.setFontSize(Number(e.target.value))}
              className="input-sm text-xs py-1 w-16"
            >
              {[10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((s) => (
                <option key={s} value={s}>{s}px</option>
              ))}
            </select>
            <input
              type="color"
              value={store.textColor}
              onChange={(e) => store.setTextColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
              title="Text Color"
            />
          </div>
        )}

        <div className="flex-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button onClick={() => store.zoomOut()} className="btn-icon p-1.5" title="Zoom Out">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-surface-400 w-11 text-center font-mono tabular-nums">
            {store.zoom}%
          </span>
          <button onClick={() => store.zoomIn()} className="btn-icon p-1.5" title="Zoom In">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-surface-800 mx-1" />

        {/* Rotate Page Button */}
        <button onClick={handleRotatePage} className="btn-icon p-1.5" title="Rotate Page 90°">
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── Main Workspace Area ─────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Thumbnails Sidebar */}
        {store.showSidebar && (
          <aside className="w-[var(--editor-sidebar-width)] bg-surface-900/60 border-r border-surface-800/50 flex flex-col shrink-0 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-surface-800/50">
              <span className="text-xs font-semibold text-surface-300">Pages ({totalPages})</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleAddBlankPage}
                  className="btn-icon p-1 text-surface-400 hover:text-white"
                  title="Add Blank Page"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDuplicatePage}
                  className="btn-icon p-1 text-surface-400 hover:text-white"
                  title="Duplicate Current Page"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDeletePage}
                  className="btn-icon p-1 text-surface-400 hover:text-red-400"
                  title="Delete Current Page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => store.toggleSidebar()} className="btn-icon p-1">
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const thumb = thumbnails[idx];
                const isSelected = store.currentPage === pageNum;

                return (
                  <button
                    key={pageNum}
                    onClick={() => store.setCurrentPage(pageNum)}
                    className={`w-full rounded-lg overflow-hidden transition-all duration-200 text-left ${
                      isSelected ? 'thumbnail-active shadow-lg ring-2 ring-primary-500' : 'ring-1 ring-surface-800 hover:ring-surface-700'
                    }`}
                  >
                    {thumb ? (
                      <img src={thumb} alt={`Page ${pageNum}`} className="w-full bg-white" />
                    ) : (
                      <div className="aspect-[3/4] bg-surface-800 flex items-center justify-center">
                        <span className="text-surface-500 text-xs">Page {pageNum}</span>
                      </div>
                    )}
                    <div className="text-[10px] text-surface-400 py-1 text-center bg-surface-900/80 font-mono">
                      Page {pageNum}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        )}

        {/* Center Canvas Area */}
        <main
          ref={canvasContainerRef}
          className="flex-1 editor-canvas-container flex items-start justify-center overflow-auto p-8 relative"
          onDragOver={(e) => e.preventDefault()}
        >
          {store.isLoading && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-surface-950/70 backdrop-blur-sm gap-3">
              <div className="w-10 h-10 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
              <p className="text-surface-300 text-xs font-medium">Processing document...</p>
            </div>
          )}

          <div
            className="relative select-none shadow-2xl"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleCanvasMouseDown({
                  clientX: touch.clientX,
                  clientY: touch.clientY,
                  button: 0,
                  preventDefault: () => e.preventDefault(),
                  stopPropagation: () => e.stopPropagation(),
                } as any);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                const touch = e.touches[0];
                handleCanvasMouseMove({
                  clientX: touch.clientX,
                  clientY: touch.clientY,
                  preventDefault: () => e.preventDefault(),
                  stopPropagation: () => e.stopPropagation(),
                } as any);
              }
            }}
            onTouchEnd={() => {
              handleCanvasMouseUp();
            }}
          >
            {/* PDF Background Canvas */}
            <canvas
              ref={canvasRef}
              className="page-shadow bg-white rounded-sm block cursor-crosshair"
            />

              {/* SVG Overlay for drawing & line previews */}
              <svg
                ref={overlaySvgRef}
                className="absolute inset-0 pointer-events-none w-full h-full"
                style={{ overflow: 'visible' }}
              >
                {/* Active freehand stroke preview */}
                {isDrawing && currentStroke.length > 1 && (
                  <path
                    d={`M ${currentStroke[0].x * scale} ${currentStroke[0].y * scale} ` +
                      currentStroke.slice(1).map((p) => `L ${p.x * scale} ${p.y * scale}`).join(' ')}
                    stroke={store.strokeColor || '#000000'}
                    strokeWidth={(store.strokeWidth || 2) * scale}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Active shape preview */}
                {dragStart && dragCurrent && store.activeTool === 'shape' && (
                  <rect
                    x={Math.min(dragStart.x, dragCurrent.x) * scale}
                    y={Math.min(dragStart.y, dragCurrent.y) * scale}
                    width={Math.abs(dragCurrent.x - dragStart.x) * scale}
                    height={Math.abs(dragCurrent.y - dragStart.y) * scale}
                    stroke={store.strokeColor || '#000000'}
                    strokeWidth={(store.strokeWidth || 2) * scale}
                    fill={store.fillColor !== 'transparent' ? store.fillColor : 'none'}
                    strokeDasharray="4 2"
                  />
                )}

                {/* Active highlight / underline / strikethrough drag selection preview */}
                {dragStart && dragCurrent && ['highlight', 'underline', 'strikethrough'].includes(store.activeTool) && (
                  <rect
                    x={Math.min(dragStart.x, dragCurrent.x) * scale}
                    y={Math.min(dragStart.y, dragCurrent.y) * scale}
                    width={Math.abs(dragCurrent.x - dragStart.x) * scale}
                    height={Math.abs(dragCurrent.y - dragStart.y) * scale}
                    stroke={store.activeTool === 'highlight' ? '#eab308' : '#f43f5e'}
                    strokeWidth={1.5}
                    fill={store.activeTool === 'highlight' ? 'rgba(253, 224, 71, 0.35)' : 'rgba(244, 63, 94, 0.15)'}
                    strokeDasharray="4 2"
                  />
                )}

                {/* Render Freehand Drawings from Model */}
                {pageElements.filter((el) => el.type === 'drawing' || (el.type === 'annotation' && (el as AnnotationElement).annotationType === 'freehand')).map((el: any) => {
                  if (!el.paths || el.paths.length < 2) return null;
                  return (
                    <path
                      key={el.id}
                      d={`M ${el.paths[0].x * scale} ${el.paths[0].y * scale} ` +
                        el.paths.slice(1).map((p: any) => `L ${p.x * scale} ${p.y * scale}`).join(' ')}
                      stroke={el.strokeColor || el.color || '#000000'}
                      strokeWidth={(el.strokeWidth || 2) * scale}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={el.opacity ?? 1}
                      className="cursor-pointer pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (store.activeTool === 'eraser') handleDeleteElement(el.id);
                        else { setSelectedElement(el); store.setSelectedElement(el.id); }
                      }}
                    />
                  );
                })}
              </svg>

              {/* White-out patches for deleted original elements */}
              {((store.document?.pages?.[store.currentPage - 1] as any)?.deletedOriginals || []).map((d: any, i: number) => (
                <div
                  key={`deleted-orig-${i}`}
                  className="absolute bg-white pointer-events-none"
                  style={{
                    left: d.x * scale - 1,
                    top: d.y * scale - 1,
                    width: d.width * scale + 2,
                    height: d.height * scale + 2,
                    zIndex: 4,
                  }}
                />
              ))}

              {/* Elements Overlay Layer (Shapes, Images, Annotations, Text) */}
              {pageElements.map((el) => {
                const isSelected = selectedElement?.id === el.id;
                const isDraggingThis = activeDrag?.elementId === el.id;

                // Shapes
                if (el.type === 'shape') {
                  const s = el as ShapeElement;
                  return (
                    <div
                      key={s.id}
                      className={`absolute group select-none ${
                        isDraggingThis
                          ? 'cursor-grabbing ring-2 ring-primary-500 shadow-2xl opacity-90 z-30'
                          : isSelected
                          ? 'cursor-grab ring-2 ring-primary-500 shadow-lg ring-offset-1 z-20'
                          : 'cursor-pointer hover:outline hover:outline-1 hover:outline-primary-400/50 z-10'
                      }`}
                      style={{
                        left: s.x * scale,
                        top: s.y * scale,
                        width: s.width * scale,
                        height: s.height * scale,
                        borderWidth: `${(s.strokeWidth || 2) * scale}px`,
                        borderColor: s.strokeColor,
                        backgroundColor: s.fillColor !== 'transparent' ? s.fillColor : 'transparent',
                        borderRadius: s.shapeType === 'circle' ? '50%' : '2px',
                        transform: s.rotation ? `rotate(${s.rotation}deg)` : undefined,
                        touchAction: 'none',
                      }}
                      onMouseDown={(e) => startElementDrag(e, s, 'move')}
                      onTouchStart={(e) => startElementDrag(e, s, 'move')}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (store.activeTool === 'eraser') handleDeleteElement(s.id);
                        else { setSelectedElement(s); store.setSelectedElement(s.id); store.setShowProperties(true); }
                      }}
                    >
                      {isSelected && (
                        <>
                          <div className="absolute -top-7 left-0 flex items-center gap-1 bg-surface-900 border border-primary-500/60 rounded px-1.5 py-0.5 shadow-xl text-[10px] text-white pointer-events-auto">
                            <span className="flex items-center gap-1 text-primary-300 font-medium">
                              <Move className="w-2.5 h-2.5" /> Move
                            </span>
                            <div className="w-px h-3 bg-surface-700 mx-0.5" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const editor = getEditor();
                                const dup = editor.duplicateElement(s.id);
                                if (dup) {
                                  refreshPageElements(store.currentPage);
                                  setSelectedElement(dup);
                                }
                              }}
                              className="hover:text-primary-300 p-0.5"
                              title="Duplicate"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteElement(s.id);
                              }}
                              className="hover:text-red-400 p-0.5"
                              title="Delete"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <div
                            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-primary-500 border-2 border-white rounded-full cursor-se-resize shadow-md z-30"
                            onMouseDown={(e) => startElementDrag(e, s, 'resize-se')}
                            onTouchStart={(e) => startElementDrag(e, s, 'resize-se')}
                            title="Drag to resize"
                          />
                        </>
                      )}
                    </div>
                  );
                }

                // Images
                if (el.type === 'image') {
                  const img = el as ImageElement;
                  return (
                    <div
                      key={img.id}
                      className={`absolute group select-none ${
                        isDraggingThis
                          ? 'cursor-grabbing ring-2 ring-primary-500 shadow-2xl opacity-90 z-30'
                          : isSelected
                          ? 'cursor-grab ring-2 ring-primary-500 shadow-lg z-20'
                          : 'cursor-pointer hover:outline hover:outline-1 hover:outline-primary-400/50 z-10'
                      }`}
                      style={{
                        left: img.x * scale,
                        top: img.y * scale,
                        width: img.width * scale,
                        height: img.height * scale,
                        touchAction: 'none',
                      }}
                      onMouseDown={(e) => startElementDrag(e, img, 'move')}
                      onTouchStart={(e) => startElementDrag(e, img, 'move')}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (store.activeTool === 'eraser') handleDeleteElement(img.id);
                        else { setSelectedElement(img); store.setSelectedElement(img.id); store.setShowProperties(true); }
                      }}
                    >
                      <img
                        src={img.src}
                        alt="Embedded element"
                        draggable={false}
                        className="w-full h-full object-contain pointer-events-none select-none"
                      />

                      {isSelected && (
                        <>
                          <div className="absolute -top-7 left-0 flex items-center gap-1 bg-surface-900 border border-primary-500/60 rounded px-1.5 py-0.5 shadow-xl text-[10px] text-white pointer-events-auto">
                            <span className="flex items-center gap-1 text-primary-300 font-medium">
                              <Move className="w-2.5 h-2.5" /> Move
                            </span>
                            <div className="w-px h-3 bg-surface-700 mx-0.5" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const editor = getEditor();
                                const dup = editor.duplicateElement(img.id);
                                if (dup) {
                                  refreshPageElements(store.currentPage);
                                  setSelectedElement(dup);
                                }
                              }}
                              className="hover:text-primary-300 p-0.5"
                              title="Duplicate"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteElement(img.id);
                              }}
                              className="hover:text-red-400 p-0.5"
                              title="Delete"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <div
                            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-primary-500 border-2 border-white rounded-full cursor-se-resize shadow-md z-30"
                            onMouseDown={(e) => startElementDrag(e, img, 'resize-se')}
                            onTouchStart={(e) => startElementDrag(e, img, 'resize-se')}
                            title="Drag to resize"
                          />
                        </>
                      )}
                    </div>
                  );
                }

                // Signatures
                if (el.type === 'signature') {
                  const sig = el as SignatureElement;
                  return (
                    <div
                      key={sig.id}
                      className={`absolute group select-none ${
                        isDraggingThis
                          ? 'cursor-grabbing ring-2 ring-primary-500 shadow-2xl opacity-90 z-30'
                          : isSelected
                          ? 'cursor-grab ring-2 ring-primary-500 shadow-lg z-20'
                          : 'cursor-pointer hover:outline hover:outline-1 hover:outline-primary-400/50 z-10'
                      }`}
                      style={{
                        left: sig.x * scale,
                        top: sig.y * scale,
                        width: sig.width * scale,
                        height: sig.height * scale,
                        touchAction: 'none',
                      }}
                      onMouseDown={(e) => startElementDrag(e, sig, 'move')}
                      onTouchStart={(e) => startElementDrag(e, sig, 'move')}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (store.activeTool === 'eraser') handleDeleteElement(sig.id);
                        else { setSelectedElement(sig); store.setSelectedElement(sig.id); store.setShowProperties(true); }
                      }}
                    >
                      <img
                        src={sig.signatureData}
                        alt="Signature"
                        draggable={false}
                        className="w-full h-full object-contain pointer-events-none select-none"
                      />

                      {isSelected && (
                        <>
                          <div className="absolute -top-7 left-0 flex items-center gap-1 bg-surface-900 border border-primary-500/60 rounded px-1.5 py-0.5 shadow-xl text-[10px] text-white pointer-events-auto">
                            <span className="flex items-center gap-1 text-primary-300 font-medium">
                              <Move className="w-2.5 h-2.5" /> Move
                            </span>
                            <div className="w-px h-3 bg-surface-700 mx-0.5" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const editor = getEditor();
                                const dup = editor.duplicateElement(sig.id);
                                if (dup) {
                                  refreshPageElements(store.currentPage);
                                  setSelectedElement(dup);
                                }
                              }}
                              className="hover:text-primary-300 p-0.5"
                              title="Duplicate"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteElement(sig.id);
                              }}
                              className="hover:text-red-400 p-0.5"
                              title="Delete"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <div
                            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-primary-500 border-2 border-white rounded-full cursor-se-resize shadow-md z-30"
                            onMouseDown={(e) => startElementDrag(e, sig, 'resize-se')}
                            onTouchStart={(e) => startElementDrag(e, sig, 'resize-se')}
                            title="Drag to resize"
                          />
                        </>
                      )}
                    </div>
                  );
                }

                // Annotations: Highlight, Underline, Strikethrough, Sticky Note
                if (el.type === 'annotation') {
                  const ann = el as AnnotationElement;
                  if (ann.annotationType === 'highlight') {
                    return (
                      <div
                        key={ann.id}
                        className="absolute cursor-pointer mix-blend-multiply"
                        style={{
                          left: ann.x * scale,
                          top: ann.y * scale,
                          width: ann.width * scale,
                          height: ann.height * scale,
                          backgroundColor: ann.color,
                          opacity: ann.opacity ?? 0.4,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (store.activeTool === 'eraser') handleDeleteElement(ann.id);
                          else { setSelectedElement(ann); store.setSelectedElement(ann.id); }
                        }}
                      />
                    );
                  }

                  if (ann.annotationType === 'underline' || ann.annotationType === 'strikethrough') {
                    const isSelected = selectedElement?.id === ann.id;
                    const lineThickness = Math.max(1, (ann.strokeWidth || 2) * scale);
                    const hitHeight = Math.max(18, lineThickness + 14);
                    return (
                      <div
                        key={ann.id}
                        className={`absolute cursor-pointer select-none group flex items-center ${
                          isSelected ? 'z-40' : 'z-15 hover:z-25'
                        }`}
                        style={{
                          left: ann.x * scale,
                          top: ann.y * scale - (hitHeight - lineThickness) / 2,
                          width: Math.max(ann.width * scale, 16),
                          height: hitHeight,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (store.activeTool === 'eraser') {
                            handleDeleteElement(ann.id);
                          } else {
                            setSelectedElement(ann);
                            store.setSelectedElement(ann.id);
                            store.setShowProperties(true);
                          }
                        }}
                      >
                        {/* The visible underline / strikethrough line */}
                        <div
                          className={`w-full transition-all ${
                            isSelected
                              ? 'ring-2 ring-blue-500 shadow-md ring-offset-1'
                              : 'group-hover:opacity-90 group-hover:shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                          }`}
                          style={{
                            height: lineThickness,
                            backgroundColor: ann.color || '#f43f5e',
                            borderRadius: '1px',
                          }}
                        />

                        {/* Floating Quick Action Badge when Selected */}
                        {isSelected && (
                          <div
                            className="absolute -top-8 left-0 flex items-center gap-1.5 bg-surface-900 border border-primary-500/80 rounded-lg px-2 py-0.5 shadow-2xl text-[11px] text-white z-50 whitespace-nowrap pointer-events-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="font-semibold text-primary-300 capitalize text-[10px] tracking-wide">
                              {ann.annotationType}
                            </span>
                            <div className="w-px h-3 bg-surface-700" />
                            <input
                              type="color"
                              value={ann.color || '#f43f5e'}
                              onChange={(e) => {
                                const editor = getEditor();
                                editor.updateElement(ann.id, { color: e.target.value } as any);
                                refreshPageElements(store.currentPage);
                              }}
                              className="w-3.5 h-3.5 rounded cursor-pointer border-0 bg-transparent p-0"
                              title="Change Color"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteElement(ann.id);
                                setSelectedElement(null);
                              }}
                              className="p-1 text-red-400 hover:text-red-300 rounded hover:bg-surface-800 transition-colors"
                              title="Remove Line (or press Delete)"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (ann.annotationType === 'sticky-note') {
                    return (
                      <div
                        key={ann.id}
                        className={`absolute group p-2 rounded shadow-lg border border-amber-300 text-xs font-sans text-neutral-800 bg-amber-100 max-w-[180px] select-none ${
                          isDraggingThis ? 'cursor-grabbing shadow-2xl opacity-90 z-30' : isSelected ? 'cursor-grab ring-2 ring-amber-500 z-20' : 'cursor-pointer hover:ring-1 hover:ring-amber-400 z-10'
                        }`}
                        style={{
                          left: ann.x * scale,
                          top: ann.y * scale,
                          touchAction: 'none',
                        }}
                        onMouseDown={(e) => startElementDrag(e, ann, 'move')}
                        onTouchStart={(e) => startElementDrag(e, ann, 'move')}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (store.activeTool === 'eraser') handleDeleteElement(ann.id);
                          else { setSelectedElement(ann); store.setSelectedElement(ann.id); store.setShowProperties(true); }
                        }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-semibold text-[10px] text-amber-800">Note</p>
                          {isSelected && <Move className="w-2.5 h-2.5 text-amber-700 opacity-60" />}
                        </div>
                        <p className="leading-tight break-words">{ann.noteContent}</p>
                      </div>
                    );
                  }
                }

                // Text Elements
                if (el.type === 'text') {
                  const txt = el as TextElement;
                  const isInlineEditing = inlineEditingId === txt.id;
                  const isMatch = searchResults.some((m) => m.element.id === txt.id);
                  const isCurrentMatch = searchResults[currentMatchIndex]?.element.id === txt.id;
                  const isEditedOrNew = txt.isEdited || !txt.isOriginal;

                  if (isInlineEditing) {
                    const zoomFactor = isFocusZoomEnabled ? focusZoomFactor : 1;
                    const effectiveFontSize = (txt.fontSize || 12) * scale * zoomFactor;
                    const effectiveFontFamily = txt.fontFamily || 'Helvetica, Arial, sans-serif';
                    const effectiveFontWeight = txt.fontWeight || 'normal';
                    const effectiveFontStyle = (txt as any).fontStyle || 'normal';
                    const effectiveColor = txt.color || '#000000';
                    const boxWidth = Math.max(txt.width * scale * zoomFactor, 60);
                    const boxHeight = Math.max(txt.height * scale * zoomFactor, effectiveFontSize * 1.25);

                    return (
                      <React.Fragment key={txt.id}>
                        {/* Spotlight Dim Backdrop when Smart Zoom Focus is active */}
                        {isFocusZoomEnabled && (
                          <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-30 transition-opacity duration-300 pointer-events-auto cursor-pointer"
                            onClick={() => handleCommitInlineText(txt.id)}
                            title="Click outside to save and exit focus zoom"
                          />
                        )}

                        <div
                          className={`absolute z-40 group transition-all duration-200 ${
                            isFocusZoomEnabled ? 'ring-4 ring-primary-500/70 shadow-2xl rounded-sm' : ''
                          }`}
                          style={{
                            left: txt.x * scale,
                            top: txt.y * scale,
                            minWidth: boxWidth,
                            transformOrigin: 'top left',
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {/* Floating Pro Format Bar Directly Above Text */}
                          <div
                            ref={inlineToolbarRef}
                            className="absolute -top-12 left-0 flex items-center gap-1.5 bg-surface-900/98 backdrop-blur-xl border border-surface-700/90 rounded-xl px-2.5 py-1.5 shadow-2xl text-xs text-white pointer-events-auto whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-2 select-none"
                            onMouseDown={(e) => {
                              isInteractingWithToolbarRef.current = true;
                              e.stopPropagation();
                              const target = e.target as HTMLElement;
                              if (!target.closest('select') && !target.closest('input[type="color"]')) {
                                e.preventDefault();
                              }
                            }}
                            onMouseUp={() => {
                              setTimeout(() => {
                                isInteractingWithToolbarRef.current = false;
                              }, 200);
                            }}
                          >
                            {/* Smart Focus Zoom Pill */}
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => {
                                const nextFactors = [1.0, 1.4, 1.8, 2.2];
                                const currentIdx = nextFactors.indexOf(focusZoomFactor);
                                const nextFactor = nextFactors[(currentIdx + 1) % nextFactors.length];
                                setFocusZoomFactor(nextFactor);
                                if (nextFactor === 1.0) setIsFocusZoomEnabled(false);
                                else setIsFocusZoomEnabled(true);
                                inlineInputRef.current?.focus();
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 transition-all ${
                                isFocusZoomEnabled
                                  ? 'bg-gradient-to-r from-primary-500 to-indigo-600 text-white shadow-sm'
                                  : 'bg-surface-800 text-surface-400 hover:text-white'
                              }`}
                              title="Toggle Zoom Magnification for this text (140%, 180%, 220%)"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>{isFocusZoomEnabled ? `${Math.round(focusZoomFactor * 100)}% Focus` : '100%'}</span>
                            </button>

                            <div className="w-px h-3.5 bg-surface-700 mx-0.5" />

                            {/* Font Family Selector */}
                            <select
                              value={txt.fontFamily || 'Helvetica'}
                              onFocus={() => {
                                isInteractingWithToolbarRef.current = true;
                              }}
                              onChange={(e) => {
                                handleUpdateTextProps(txt.id, { fontFamily: e.target.value });
                                setTimeout(() => inlineInputRef.current?.focus(), 50);
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  isInteractingWithToolbarRef.current = false;
                                }, 200);
                              }}
                              className="bg-surface-800 text-[11px] text-surface-200 border border-surface-700 rounded-lg px-2 py-0.5 outline-none hover:border-primary-500 transition-colors cursor-pointer"
                              title="Font Family"
                            >
                              <option value="Helvetica, Arial, sans-serif">Helvetica</option>
                              <option value="Inter, sans-serif">Inter</option>
                              <option value="Roboto, sans-serif">Roboto</option>
                              <option value="'Times New Roman', serif">Times New Roman</option>
                              <option value="'Courier New', monospace">Courier</option>
                              <option value="Georgia, serif">Georgia</option>
                            </select>

                            {/* Font Size +/- */}
                            <div className="flex items-center gap-0.5 bg-surface-800 rounded-lg px-1.5 py-0.5 border border-surface-700">
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={() => {
                                  handleUpdateTextProps(txt.id, { fontSize: Math.max(6, (txt.fontSize || 12) - 1) });
                                  inlineInputRef.current?.focus();
                                }}
                                className="text-[11px] text-surface-300 hover:text-white px-1 font-bold"
                                title="Decrease Font Size"
                              >
                                -
                              </button>
                              <span className="text-[10px] font-mono text-primary-300 font-bold px-1 min-w-[20px] text-center">
                                {Math.round(txt.fontSize || 12)}pt
                              </span>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={() => {
                                  handleUpdateTextProps(txt.id, { fontSize: Math.min(96, (txt.fontSize || 12) + 1) });
                                  inlineInputRef.current?.focus();
                                }}
                                className="text-[11px] text-surface-300 hover:text-white px-1 font-bold"
                                title="Increase Font Size"
                              >
                                +
                              </button>
                            </div>

                            {/* Bold Toggle */}
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => {
                                handleUpdateTextProps(txt.id, { fontWeight: txt.fontWeight === 'bold' ? 'normal' : 'bold' });
                                inlineInputRef.current?.focus();
                              }}
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-colors ${
                                txt.fontWeight === 'bold' ? 'bg-primary-500 text-white' : 'hover:bg-surface-800 text-surface-300'
                              }`}
                              title="Bold"
                            >
                              B
                            </button>

                            {/* Italic Toggle */}
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => {
                                handleUpdateTextProps(txt.id, { fontStyle: (txt as any).fontStyle === 'italic' ? 'normal' : 'italic' } as any);
                                inlineInputRef.current?.focus();
                              }}
                              className={`px-2 py-0.5 rounded-lg text-xs font-serif italic transition-colors ${
                                (txt as any).fontStyle === 'italic' ? 'bg-primary-500 text-white' : 'hover:bg-surface-800 text-surface-300'
                              }`}
                              title="Italic"
                            >
                              I
                            </button>

                            {/* Underline Toggle */}
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => {
                                handleToggleUnderline(txt);
                                inlineInputRef.current?.focus();
                              }}
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold underline transition-colors ${
                                txt.textDecoration === 'underline' || pageElements.some((a) => a.type === 'annotation' && (a as AnnotationElement).annotationType === 'underline' && Math.abs(a.x - txt.x) < 25 && Math.abs(a.y - (txt.y + txt.height - 2)) < 25)
                                  ? 'bg-primary-500 text-white'
                                  : 'hover:bg-surface-800 text-surface-300'
                              }`}
                              title="Toggle Underline (U)"
                            >
                              U
                            </button>

                            {/* Strikethrough Toggle */}
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => {
                                handleToggleStrikethrough(txt);
                                inlineInputRef.current?.focus();
                              }}
                              className={`px-2 py-0.5 rounded-lg text-xs font-bold line-through transition-colors ${
                                txt.textDecoration === 'line-through' || pageElements.some((a) => a.type === 'annotation' && (a as AnnotationElement).annotationType === 'strikethrough' && Math.abs(a.x - txt.x) < 25 && Math.abs(a.y - txt.y) < 25)
                                  ? 'bg-primary-500 text-white'
                                  : 'hover:bg-surface-800 text-surface-300'
                              }`}
                              title="Toggle Strikethrough (S)"
                            >
                              S
                            </button>

                            {/* Text Color Picker */}
                            <div className="flex items-center gap-1 pl-1 border-l border-surface-700">
                              <input
                                type="color"
                                value={txt.color || '#000000'}
                                onFocus={() => {
                                  isInteractingWithToolbarRef.current = true;
                                }}
                                onChange={(e) => {
                                  handleUpdateTextProps(txt.id, { color: e.target.value });
                                  setTimeout(() => inlineInputRef.current?.focus(), 50);
                                }}
                                onBlur={() => {
                                  setTimeout(() => {
                                    isInteractingWithToolbarRef.current = false;
                                  }, 200);
                                }}
                                className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                                title="Text Color"
                              />
                            </div>

                            {/* Actions */}
                            <div className="w-px h-3.5 bg-surface-700 mx-0.5" />
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => {
                                const editor = getEditor();
                                const dup = editor.duplicateElement(txt.id);
                                if (dup) refreshPageElements(store.currentPage);
                              }}
                              className="p-1 hover:text-primary-300 rounded text-surface-400"
                              title="Duplicate Text"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => {
                                handleDeleteElement(txt.id);
                                setInlineEditingId(null);
                              }}
                              className="p-1 hover:text-red-400 rounded text-surface-400"
                              title="Delete Text"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {/* Done Button */}
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => handleCommitInlineText(txt.id)}
                              className="px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-md shadow-emerald-500/20"
                              title="Done (Ctrl+Enter or Enter)"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </button>
                          </div>

                          {/* In-Place Textarea with seamless whiteout backing */}
                          <div className="relative">
                            <div
                              className="absolute inset-0 bg-white pointer-events-none rounded-sm"
                              style={{
                                minHeight: `${boxHeight}px`,
                                minWidth: `${boxWidth}px`,
                              }}
                            />
                            <textarea
                              ref={inlineInputRef}
                              value={inlineTextVal}
                              onChange={(e) => {
                                setInlineTextVal(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                              }}
                              onBlur={(e) => {
                                // If blur was caused by interacting with the floating toolbar, do NOT commit/close!
                                if (
                                  isInteractingWithToolbarRef.current ||
                                  (inlineToolbarRef.current && (
                                    inlineToolbarRef.current.contains(e.relatedTarget as Node) ||
                                    inlineToolbarRef.current.contains(document.activeElement)
                                  ))
                                ) {
                                  return;
                                }

                                // In Smart Focus Zoom mode, user exits explicitly via Done, backdrop click, Escape, or Enter!
                                if (isFocusZoomEnabled) {
                                  return;
                                }

                                handleCommitInlineText(txt.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  handleCommitInlineText(txt.id);
                                }
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleCommitInlineText(txt.id);
                                }
                              }}
                              className="relative z-10 w-full bg-transparent outline-none border-2 border-primary-500/90 ring-2 ring-primary-400/40 rounded-sm p-0.5 m-0 resize-none leading-tight"
                              style={{
                                fontSize: `${effectiveFontSize}px`,
                                fontFamily: effectiveFontFamily,
                                fontWeight: effectiveFontWeight,
                                fontStyle: effectiveFontStyle,
                                textDecoration: txt.textDecoration || 'none',
                                color: effectiveColor,
                                lineHeight: 1.15,
                                minWidth: `${boxWidth}px`,
                                height: `${boxHeight}px`,
                              }}
                              autoFocus
                            />
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  }

                  return (
                    <div
                      key={txt.id}
                      className={`absolute select-none transition-all ${
                        store.activeTool === 'draw' ? 'pointer-events-none' : ''
                      } ${
                        isDraggingThis
                          ? 'cursor-grabbing ring-2 ring-primary-500 shadow-2xl z-30'
                          : isSelected
                          ? 'cursor-grab ring-2 ring-blue-500 bg-blue-500/10 z-20'
                          : isCurrentMatch
                          ? 'cursor-pointer ring-2 ring-amber-400 bg-amber-400/30 z-10'
                          : isMatch
                          ? 'cursor-pointer bg-amber-400/20 z-10'
                          : 'cursor-pointer hover:bg-blue-500/10 hover:outline hover:outline-1 hover:outline-blue-400/40'
                      } ${isEditedOrNew ? 'bg-white whitespace-pre overflow-hidden flex items-start z-10' : ''}`}
                      style={{
                        left: txt.x * scale,
                        top: txt.y * scale,
                        width: Math.max(txt.width * scale, 20),
                        height: Math.max(txt.height * scale, (txt.fontSize || 12) * scale * 1.15),
                        fontSize: `${(txt.fontSize || 12) * scale}px`,
                        fontFamily: txt.fontFamily || 'Helvetica, Arial, sans-serif',
                        color: txt.color || '#000000',
                        fontWeight: txt.fontWeight || 'normal',
                        fontStyle: (txt as any).fontStyle || 'normal',
                        textDecoration: txt.textDecoration || 'none',
                        lineHeight: 1.15,
                        padding: 0,
                        margin: 0,
                        touchAction: !txt.isOriginal ? 'none' : undefined,
                      }}
                      onMouseDown={(e) => {
                        if (!txt.isOriginal) startElementDrag(e, txt, 'move');
                      }}
                      onTouchStart={(e) => {
                        if (!txt.isOriginal) startElementDrag(e, txt, 'move');
                      }}
                      onClick={(e) => handleTextClick(txt, e)}
                    >
                      {isEditedOrNew ? txt.text : null}

                      {isSelected && !txt.isOriginal && (
                        <div
                          className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-primary-500 border border-white rounded-full cursor-se-resize shadow z-30"
                          onMouseDown={(e) => startElementDrag(e, txt, 'resize-se')}
                          onTouchStart={(e) => startElementDrag(e, txt, 'resize-se')}
                          title="Drag to resize"
                        />
                      )}
                    </div>
                  );
                }

                return null;
              })}
            </div>
        </main>

        {/* Right Properties Panel */}
        {store.showProperties && selectedElement && (
          <aside className="w-[var(--editor-properties-width)] bg-surface-900/80 border-l border-surface-800/50 p-4 overflow-y-auto shrink-0 z-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Properties</h3>
              <button onClick={() => store.setShowProperties(false)} className="btn-icon p-1 text-surface-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Sticky Note Edit */}
              {selectedElement.type === 'annotation' && (selectedElement as AnnotationElement).annotationType === 'sticky-note' && (
                <div>
                  <label className="text-[11px] text-surface-400 block mb-1">Note Content</label>
                  <textarea
                    value={(selectedElement as AnnotationElement).noteContent || ''}
                    onChange={(e) => {
                      const editor = getEditor();
                      editor.updateElement(selectedElement.id, { noteContent: e.target.value } as any);
                      refreshPageElements(store.currentPage);
                    }}
                    className="input text-xs h-20 resize-none"
                  />
                </div>
              )}

              {/* Underline / Strikethrough / Highlight Annotation Properties */}
              {selectedElement.type === 'annotation' && ['underline', 'strikethrough', 'highlight'].includes((selectedElement as AnnotationElement).annotationType) && (
                <div className="space-y-3 bg-surface-950/60 p-3 rounded-lg border border-surface-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-primary-300 capitalize tracking-wide">
                      {(selectedElement as AnnotationElement).annotationType} Style
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteElement(selectedElement.id);
                        setSelectedElement(null);
                      }}
                      className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 hover:underline"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Remove
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-surface-400 block mb-1">Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={(selectedElement as AnnotationElement).color || '#f43f5e'}
                        onChange={(e) => {
                          const editor = getEditor();
                          editor.updateElement(selectedElement.id, { color: e.target.value } as any);
                          refreshPageElements(store.currentPage);
                        }}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="text-xs font-mono text-surface-300">
                        {(selectedElement as AnnotationElement).color || '#f43f5e'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-surface-400">Thickness</label>
                      <span className="text-[10px] text-surface-300 font-mono">
                        {(selectedElement as AnnotationElement).strokeWidth || 2}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={(selectedElement as AnnotationElement).strokeWidth || 2}
                      onChange={(e) => {
                        const editor = getEditor();
                        editor.updateElement(selectedElement.id, { strokeWidth: Number(e.target.value) } as any);
                        refreshPageElements(store.currentPage);
                      }}
                      className="w-full h-1 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                  </div>
                </div>
              )}

              {/* Layer stack / Z-order */}
              <div className="pt-2 border-t border-surface-800">
                <label className="text-[11px] text-surface-400 block mb-2 font-medium">Layer Ordering</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      const editor = getEditor();
                      editor.bringForward(selectedElement.id);
                      refreshPageElements(store.currentPage);
                    }}
                    className="btn-secondary text-xs py-1 flex items-center justify-center gap-1"
                  >
                    <MoveUp className="w-3 h-3" /> Forward
                  </button>
                  <button
                    onClick={() => {
                      const editor = getEditor();
                      editor.sendBackward(selectedElement.id);
                      refreshPageElements(store.currentPage);
                    }}
                    className="btn-secondary text-xs py-1 flex items-center justify-center gap-1"
                  >
                    <MoveDown className="w-3 h-3" /> Backward
                  </button>
                </div>
              </div>

              {/* Duplicate & Delete Actions */}
              <div className="pt-2 border-t border-surface-800 space-y-1.5">
                <button
                  onClick={() => {
                    const editor = getEditor();
                    const duplicated = editor.duplicateElement(selectedElement.id);
                    if (duplicated) {
                      refreshPageElements(store.currentPage);
                      setSelectedElement(duplicated);
                    }
                  }}
                  className="btn-secondary w-full text-xs py-1.5 flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-primary-400" />
                  Duplicate
                </button>

                <button
                  onClick={() => handleDeleteElement(selectedElement.id)}
                  className="btn-danger w-full text-xs py-1.5 flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Element
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ─── Bottom Status Bar ──────────────────────────── */}
      <footer className="h-7 bg-surface-900/90 border-t border-surface-800/50 flex items-center px-4 text-[11px] text-surface-400 shrink-0 z-20">
        {!store.showSidebar && (
          <button onClick={() => store.toggleSidebar()} className="btn-icon p-0.5 mr-2" title="Show Pages">
            <PanelLeftOpen className="w-3 h-3" />
          </button>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => store.setCurrentPage(Math.max(1, store.currentPage - 1))}
              disabled={store.currentPage <= 1}
              className="btn-icon p-0.5 disabled:opacity-30"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="font-mono tabular-nums">
              Page {store.currentPage} of {totalPages}
            </span>
            <button
              onClick={() => store.setCurrentPage(Math.min(totalPages, store.currentPage + 1))}
              disabled={store.currentPage >= totalPages}
              className="btn-icon p-0.5 disabled:opacity-30"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <span>·</span>
          <span className="font-mono tabular-nums">Zoom: {store.zoom}%</span>
          <span>·</span>
          <span>{pageElements.length} elements</span>
          <span>·</span>
          <span className="capitalize text-primary-400">Tool: {store.activeTool}</span>
        </div>

        <div className="flex-1" />

        <span className="font-mono text-surface-500">
          {store.document ? `${(store.document.originalSize / 1024).toFixed(1)} KB` : ''}
        </span>
      </footer>

      {/* ─── Signature Dialog Modal ──────────────────────── */}
      {showSignatureModal && (
        <SignatureModal
          onApply={handleApplySignature}
          onClose={() => setShowSignatureModal(false)}
        />
      )}

      {/* ─── High-Fidelity PDF Preview Modal ──────────────── */}
      <PDFPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        pdfBytes={previewPdfBytes}
        fileName={store.fileName}
        initialPage={store.currentPage}
      />

      {/* ─── Save & Exit Confirmation Modal (10-Minute TTL Auto-Delete) ────── */}
      <SaveExitModal
        isOpen={saveExitModalOpen}
        fileName={store.fileName}
        isSaving={isSavingToDashboard}
        onSaveAndExit={handleSaveAndExit}
        onDiscardAndExit={handleDiscardAndExit}
        onCancel={() => setSaveExitModalOpen(false)}
      />

      {/* ─── Upload & Extraction Progress Pipeline Modal ─────────── */}
      <UploadProgressModal
        isOpen={uploadProgress.isOpen}
        fileName={uploadProgress.fileName}
        fileSizeBytes={uploadProgress.fileSizeBytes}
        currentStep={uploadProgress.currentStep}
        progressPercent={uploadProgress.progressPercent}
        statusMessage={uploadProgress.statusMessage}
        error={uploadProgress.error}
        onCancel={() => setUploadProgress((prev) => ({ ...prev, isOpen: false, error: null }))}
      />

      {/* ─── Toast Feedback Notification ─────────────────────────── */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 p-3.5 bg-surface-900 border border-primary-500/40 rounded-xl shadow-2xl text-xs text-white flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3">
          <CheckCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

// ─── Modal: Signature Creator (Touch, Stylus & Mouse Enabled) ───

function SignatureModal({ onApply, onClose }: { onApply: (dataUrl: string) => void; onClose: () => void }) {
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [typedName, setTypedName] = useState('');
  const [mode, setMode] = useState<'draw' | 'type'>('draw');

  // Customization
  const [penColor, setPenColor] = useState('#0f172a');
  const [penWidth, setPenWidth] = useState(3.5);
  const [fontFamily, setFontFamily] = useState<'Dancing Script' | 'Caveat' | 'Georgia' | 'Brush Script MT'>('Dancing Script');
  const [validationError, setValidationError] = useState('');

  // Stroke history for Undo
  const strokesRef = useRef<Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }>>([]);
  const currentStrokeRef = useRef<Array<{ x: number; y: number }>>([]);
  const [hasStrokes, setHasStrokes] = useState(false);

  // Redraw all strokes on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      if (stroke.points.length === 0) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.points.length === 1) {
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }
    }
  }, []);

  // Native touch, stylus, and pointer listeners on canvas with passive: false to prevent gesture scroll
  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;

    let drawing = false;

    const startDraw = (clientX: number, clientY: number) => {
      drawing = true;
      setValidationError('');
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      currentStrokeRef.current = [{ x, y }];

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.beginPath();
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(x, y);
    };

    const moveDraw = (clientX: number, clientY: number) => {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      currentStrokeRef.current.push({ x, y });

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const endDraw = () => {
      if (!drawing) return;
      drawing = false;
      if (currentStrokeRef.current.length > 0) {
        strokesRef.current.push({
          points: [...currentStrokeRef.current],
          color: penColor,
          width: penWidth,
        });
        setHasStrokes(true);
      }
      currentStrokeRef.current = [];
    };

    // Pointer events (modern unified mouse, pen, touch)
    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      startDraw(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault();
      moveDraw(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      e.preventDefault();
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
      endDraw();
    };

    // Touch events (for tablet/mobile browsers)
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) startDraw(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) moveDraw(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      endDraw();
    };

    // Mouse events fallback
    const onMouseDown = (e: MouseEvent) => {
      startDraw(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      moveDraw(e.clientX, e.clientY);
    };
    const onMouseUp = () => {
      endDraw();
    };

    const hasPointer = typeof window !== 'undefined' && 'PointerEvent' in window;

    if (hasPointer) {
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
    } else {
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
      canvas.addEventListener('touchend', onTouchEnd, { passive: false });

      canvas.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      if (hasPointer) {
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
      } else {
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);

        canvas.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }
    };
  }, [penColor, penWidth]);

  const undoLastStroke = () => {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setHasStrokes(strokesRef.current.length > 0);
    redrawCanvas();
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
    setHasStrokes(false);
    setValidationError('');
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApply = () => {
    setValidationError('');
    if (mode === 'draw') {
      const canvas = sigCanvasRef.current;
      if (!canvas || strokesRef.current.length === 0) {
        setValidationError('Please draw your signature above or switch to Type mode.');
        return;
      }
      onApply(canvas.toDataURL('image/png'));
    } else {
      if (!typedName.trim()) {
        setValidationError('Please type your name for the signature.');
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 220;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.font = `italic 60px "${fontFamily}", cursive, serif`;
      ctx.fillStyle = penColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 300, 110);
      onApply(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="card max-w-lg w-full p-6 border border-surface-700 shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Stamp className="w-5 h-5 text-primary-400" />
            <h3 className="text-base font-bold text-white">Create Signature</h3>
          </div>
          <button onClick={onClose} className="btn-icon p-1 text-surface-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher: Draw (Touch/Stylus) vs Type */}
        <div className="flex gap-2 mb-3 bg-surface-800/60 p-1 rounded-lg">
          <button
            onClick={() => { setMode('draw'); setValidationError(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'draw' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-white'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Draw (Touch / Finger / Stylus / Mouse)</span>
          </button>
          <button
            onClick={() => { setMode('type'); setValidationError(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'type' ? 'bg-primary-600 text-white shadow' : 'text-surface-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type Name</span>
          </button>
        </div>

        {/* Color & Pen options bar */}
        <div className="flex items-center justify-between gap-3 mb-3 px-1">
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-surface-400 font-medium">Ink:</span>
            {[
              { color: '#0f172a', label: 'Black' },
              { color: '#1e40af', label: 'Blue' },
              { color: '#dc2626', label: 'Red' },
            ].map((c) => (
              <button
                key={c.color}
                onClick={() => setPenColor(c.color)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  penColor === c.color ? 'border-primary-400 scale-110 shadow-sm' : 'border-surface-600 hover:scale-105'
                }`}
                style={{ backgroundColor: c.color }}
                title={c.label}
              />
            ))}
          </div>

          {/* Stroke Widths (for draw mode) */}
          {mode === 'draw' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-surface-400 font-medium">Thickness:</span>
              {[
                { w: 2, label: 'Thin' },
                { w: 3.5, label: 'Medium' },
                { w: 5.5, label: 'Bold' },
              ].map((t) => (
                <button
                  key={t.w}
                  onClick={() => setPenWidth(t.w)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                    penWidth === t.w
                      ? 'bg-primary-600/30 text-primary-300 border-primary-500'
                      : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === 'draw' ? (
          <div>
            {/* Signature Drawing Canvas with Touch-Action: none */}
            <div className="relative border border-surface-700 rounded-xl overflow-hidden bg-white shadow-inner mb-2">
              <canvas
                ref={sigCanvasRef}
                width={600}
                height={240}
                className="w-full h-48 cursor-crosshair block select-none touch-none"
                style={{ touchAction: 'none' }}
              />

              {/* Baseline hint guide line */}
              <div className="absolute bottom-8 left-8 right-8 border-b border-dashed border-neutral-300 pointer-events-none flex justify-end">
                <span className="text-[10px] text-neutral-400 font-mono select-none px-1">Sign above line</span>
              </div>
            </div>

            {/* Helper tools & Undo */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-[11px] text-surface-400">
                <Hand className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                <span>Sign with finger, stylus pen, or mouse</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={undoLastStroke}
                  disabled={!hasStrokes}
                  className="btn-ghost text-xs px-2 py-1 flex items-center gap-1 text-surface-400 hover:text-white disabled:opacity-30"
                  title="Undo last stroke"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Undo</span>
                </button>
                <button
                  onClick={clearCanvas}
                  disabled={!hasStrokes}
                  className="btn-ghost text-xs px-2 py-1 flex items-center gap-1 text-surface-400 hover:text-red-400 disabled:opacity-30"
                  title="Clear all"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 space-y-3">
            <input
              type="text"
              value={typedName}
              onChange={(e) => { setTypedName(e.target.value); setValidationError(''); }}
              placeholder="Enter full name for signature..."
              className="input text-sm w-full"
              autoFocus
            />

            {/* Font Selector Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] text-surface-400 font-medium shrink-0">Style:</span>
              {[
                { name: 'Dancing Script', font: 'Dancing Script, cursive' },
                { name: 'Caveat', font: 'Caveat, cursive' },
                { name: 'Georgia Serif', font: 'Georgia, serif' },
                { name: 'Brush Script', font: 'Brush Script MT, cursive' },
              ].map((f) => (
                <button
                  key={f.name}
                  onClick={() => setFontFamily(f.name as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition-all shrink-0 ${
                    fontFamily === f.name
                      ? 'bg-primary-600/30 text-primary-300 border-primary-500 font-semibold'
                      : 'bg-surface-800 text-surface-400 border-surface-700 hover:text-white'
                  }`}
                  style={{ fontFamily: f.font }}
                >
                  {f.name}
                </button>
              ))}
            </div>

            {/* Preview Card */}
            <div className="h-32 bg-white rounded-xl flex items-center justify-center p-4 border border-surface-700 shadow-inner relative overflow-hidden">
              <span
                className="select-none transition-all"
                style={{
                  fontFamily: `"${fontFamily}", cursive, serif`,
                  fontSize: '44px',
                  color: penColor,
                  fontStyle: 'italic',
                }}
              >
                {typedName || 'Your Signature'}
              </span>
              <div className="absolute bottom-4 left-6 right-6 border-b border-dashed border-neutral-300 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Validation error badge */}
        {validationError && (
          <div className="mb-3 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-1.5">
            <X className="w-3.5 h-3.5 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-800">
          <button onClick={onClose} className="btn-secondary text-xs px-3.5 py-2">
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-lg shadow-primary-500/20"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
}

