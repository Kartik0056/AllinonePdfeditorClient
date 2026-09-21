/**
 * Editor Store - Zustand state management for the PDF editor
 */

import { create } from 'zustand';
import type {
  DocumentModel,
  PDFElement,
  TextElement,
  ToolMode,
  PageInfo,
} from '@pdfeditor/shared';

interface EditorStore {
  // Document
  document: DocumentModel | null;
  originalBytes: Uint8Array | null;
  fileName: string;
  isLoading: boolean;
  error: string | null;

  // Navigation
  currentPage: number;
  zoom: number;
  viewMode: 'vertical' | 'horizontal';

  // Tool
  activeTool: ToolMode;
  selectedElementId: string | null;

  // History
  canUndo: boolean;
  canRedo: boolean;

  // Panels
  showSidebar: boolean;
  showProperties: boolean;

  // Drawing & Shape state
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  shapeType: 'rectangle' | 'circle' | 'line' | 'arrow';

  // Actions
  setDocument: (doc: DocumentModel) => void;
  setOriginalBytes: (bytes: Uint8Array) => void;
  setFileName: (name: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitWidth: () => void;
  fitPage: () => void;
  setViewMode: (mode: 'vertical' | 'horizontal') => void;
  setActiveTool: (tool: ToolMode) => void;
  setSelectedElement: (id: string | null) => void;
  setCanUndo: (can: boolean) => void;
  setCanRedo: (can: boolean) => void;
  toggleSidebar: () => void;
  toggleProperties: () => void;
  setShowProperties: (show: boolean) => void;
  setStrokeColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFillColor: (color: string) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setTextColor: (color: string) => void;
  setShapeType: (shape: 'rectangle' | 'circle' | 'line' | 'arrow') => void;
  updatePage: (pageNumber: number, updates: Partial<PageInfo>) => void;
  reset: () => void;
}

const initialState = {
  document: null,
  originalBytes: null,
  fileName: '',
  isLoading: false,
  error: null,
  currentPage: 1,
  zoom: 100,
  viewMode: 'vertical' as const,
  activeTool: 'select' as ToolMode,
  selectedElementId: null,
  canUndo: false,
  canRedo: false,
  showSidebar: true,
  showProperties: false,
  strokeColor: '#000000',
  strokeWidth: 2,
  fillColor: 'transparent',
  fontSize: 16,
  fontFamily: 'Helvetica',
  textColor: '#000000',
  shapeType: 'rectangle' as const,
};

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialState,

  setDocument: (doc) => set({ document: doc }),
  setOriginalBytes: (bytes) => set({ originalBytes: bytes }),
  setFileName: (name) => set({ fileName: name }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setZoom: (zoom) => set({ zoom: Math.max(10, Math.min(500, zoom)) }),
  zoomIn: () => set((s) => ({ zoom: Math.min(500, s.zoom + 25) })),
  zoomOut: () => set((s) => ({ zoom: Math.max(10, s.zoom - 25) })),
  fitWidth: () => set({ zoom: 100 }), // Will be recalculated based on container
  fitPage: () => set({ zoom: 75 }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedElementId: null }),
  setSelectedElement: (id) => set({ selectedElementId: id }),
  setCanUndo: (can) => set({ canUndo: can }),
  setCanRedo: (can) => set({ canRedo: can }),
  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
  toggleProperties: () => set((s) => ({ showProperties: !s.showProperties })),
  setShowProperties: (show) => set({ showProperties: show }),
  setStrokeColor: (color) => set({ strokeColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setFillColor: (color) => set({ fillColor: color }),
  setFontSize: (size) => set({ fontSize: size }),
  setFontFamily: (family) => set({ fontFamily: family }),
  setTextColor: (color) => set({ textColor: color }),
  setShapeType: (shape) => set({ shapeType: shape }),
  updatePage: (pageNumber, updates) =>
    set((s) => {
      if (!s.document) return {};
      const pages = [...s.document.pages];
      const idx = pages.findIndex((p) => p.pageNumber === pageNumber);
      if (idx !== -1) {
        pages[idx] = { ...pages[idx], ...updates };
        return { document: { ...s.document, pages } };
      }
      return {};
    }),
  reset: () => set(initialState),
}));
