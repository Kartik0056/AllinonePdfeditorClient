/**
 * PDF Editor SDK - Document Model
 * Internal representation of the PDF document being edited.
 */

import type {
  DocumentModel,
  PageInfo,
  PDFElement,
  PDFMetadata,
  TextElement,
  ImageElement,
  ShapeElement,
  AnnotationElement,
  SignatureElement,
  DrawingElement,
} from '@pdfeditor/shared';
import { generateId, deepClone } from '../utils/helpers';

/**
 * Manages the internal document model for the PDF editor.
 * All edits operate on this model, and the export step writes
 * the model back to a PDF.
 */
export class PDFDocumentModel {
  private model: DocumentModel;

  constructor() {
    this.model = {
      id: generateId(),
      fileName: '',
      totalPages: 0,
      pages: [],
      metadata: {},
      originalSize: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  // ─── Document ──────────────────────────────────────────────

  getModel(): DocumentModel {
    return deepClone(this.model);
  }

  setFileName(name: string): void {
    this.model.fileName = name;
    this.touch();
  }

  setOriginalSize(size: number): void {
    this.model.originalSize = size;
  }

  setMetadata(metadata: Partial<PDFMetadata>): void {
    this.model.metadata = { ...this.model.metadata, ...metadata };
    this.touch();
  }

  getMetadata(): PDFMetadata {
    return { ...this.model.metadata };
  }

  // ─── Pages ─────────────────────────────────────────────────

  addPage(page: Omit<PageInfo, 'elements'> & { elements?: PDFElement[] }): void {
    this.model.pages.push({
      ...page,
      elements: page.elements || [],
    });
    this.model.totalPages = this.model.pages.length;
    this.touch();
  }

  getPage(pageNumber: number): PageInfo | null {
    return this.model.pages[pageNumber - 1] || null;
  }

  getPages(): PageInfo[] {
    return [...this.model.pages];
  }

  getPageCount(): number {
    return this.model.totalPages;
  }

  deletePage(pageNumber: number): PageInfo | null {
    if (pageNumber < 1 || pageNumber > this.model.totalPages) return null;
    const [removed] = this.model.pages.splice(pageNumber - 1, 1);
    // Renumber remaining pages
    this.model.pages.forEach((p, i) => {
      p.pageNumber = i + 1;
      p.elements.forEach((e) => (e.page = i + 1));
    });
    this.model.totalPages = this.model.pages.length;
    this.touch();
    return removed;
  }

  duplicatePage(pageNumber: number): void {
    const page = this.getPage(pageNumber);
    if (!page) return;
    const clone = deepClone(page);
    clone.pageNumber = pageNumber + 1;
    clone.elements = clone.elements.map((e) => ({
      ...e,
      id: generateId(),
      page: clone.pageNumber,
      isOriginal: false,
    }));
    this.model.pages.splice(pageNumber, 0, clone);
    // Renumber pages after insertion
    for (let i = pageNumber; i < this.model.pages.length; i++) {
      this.model.pages[i].pageNumber = i + 1;
      this.model.pages[i].elements.forEach((e) => (e.page = i + 1));
    }
    this.model.totalPages = this.model.pages.length;
    this.touch();
  }

  rotatePage(pageNumber: number, degrees: number): void {
    const page = this.getPage(pageNumber);
    if (!page) return;
    page.rotation = ((page.rotation || 0) + degrees) % 360;
    if (page.rotation < 0) page.rotation += 360;
    this.touch();
  }

  reorderPages(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.model.totalPages) return;
    if (toIndex < 0 || toIndex >= this.model.totalPages) return;
    const [page] = this.model.pages.splice(fromIndex, 1);
    this.model.pages.splice(toIndex, 0, page);
    this.model.pages.forEach((p, i) => {
      p.pageNumber = i + 1;
      p.elements.forEach((e) => (e.page = i + 1));
    });
    this.touch();
  }

  insertBlankPage(afterPage: number, width: number, height: number): void {
    const blankPage: PageInfo = {
      pageNumber: afterPage + 1,
      width,
      height,
      rotation: 0,
      elements: [],
    };
    this.model.pages.splice(afterPage, 0, blankPage);
    // Renumber
    this.model.pages.forEach((p, i) => {
      p.pageNumber = i + 1;
      p.elements.forEach((e) => (e.page = i + 1));
    });
    this.model.totalPages = this.model.pages.length;
    this.touch();
  }

  // ─── Elements ──────────────────────────────────────────────

  addElement(pageNumber: number, element: PDFElement): void {
    const page = this.getPage(pageNumber);
    if (!page) return;
    element.page = pageNumber;
    page.elements.push(element);
    this.touch();
  }

  getElement(elementId: string): PDFElement | null {
    for (const page of this.model.pages) {
      const el = page.elements.find((e) => e.id === elementId);
      if (el) return el;
    }
    return null;
  }

  getElements(pageNumber: number): PDFElement[] {
    const page = this.getPage(pageNumber);
    return page ? [...page.elements] : [];
  }

  getTextElements(pageNumber: number): TextElement[] {
    return this.getElements(pageNumber).filter(
      (e): e is TextElement => e.type === 'text'
    );
  }

  getImageElements(pageNumber: number): ImageElement[] {
    return this.getElements(pageNumber).filter(
      (e): e is ImageElement => e.type === 'image'
    );
  }

  getAnnotationElements(pageNumber: number): AnnotationElement[] {
    return this.getElements(pageNumber).filter(
      (e): e is AnnotationElement => e.type === 'annotation'
    );
  }

  getShapeElements(pageNumber: number): ShapeElement[] {
    return this.getElements(pageNumber).filter(
      (e): e is ShapeElement => e.type === 'shape'
    );
  }

  updateElement(elementId: string, updates: Partial<PDFElement>): PDFElement | null {
    for (const page of this.model.pages) {
      const idx = page.elements.findIndex((e) => e.id === elementId);
      if (idx !== -1) {
        page.elements[idx] = {
          ...page.elements[idx],
          ...updates,
          updatedAt: Date.now(),
        } as PDFElement;
        this.touch();
        return page.elements[idx];
      }
    }
    return null;
  }

  duplicateElement(elementId: string, offsetX: number = 20, offsetY: number = 20): PDFElement | null {
    const original = this.getElement(elementId);
    if (!original) return null;

    const clone: PDFElement = {
      ...deepClone(original),
      id: generateId(),
      x: original.x + offsetX,
      y: original.y + offsetY,
      isOriginal: false,
      updatedAt: Date.now(),
    };

    this.addElement(original.page, clone);
    return clone;
  }

  bringForward(elementId: string): boolean {
    for (const page of this.model.pages) {
      const idx = page.elements.findIndex((e) => e.id === elementId);
      if (idx !== -1 && idx < page.elements.length - 1) {
        const [el] = page.elements.splice(idx, 1);
        page.elements.splice(idx + 1, 0, el);
        this.touch();
        return true;
      }
    }
    return false;
  }

  sendBackward(elementId: string): boolean {
    for (const page of this.model.pages) {
      const idx = page.elements.findIndex((e) => e.id === elementId);
      if (idx > 0) {
        const [el] = page.elements.splice(idx, 1);
        page.elements.splice(idx - 1, 0, el);
        this.touch();
        return true;
      }
    }
    return false;
  }

  bringToFront(elementId: string): boolean {
    for (const page of this.model.pages) {
      const idx = page.elements.findIndex((e) => e.id === elementId);
      if (idx !== -1 && idx < page.elements.length - 1) {
        const [el] = page.elements.splice(idx, 1);
        page.elements.push(el);
        this.touch();
        return true;
      }
    }
    return false;
  }

  sendToBack(elementId: string): boolean {
    for (const page of this.model.pages) {
      const idx = page.elements.findIndex((e) => e.id === elementId);
      if (idx > 0) {
        const [el] = page.elements.splice(idx, 1);
        page.elements.unshift(el);
        this.touch();
        return true;
      }
    }
    return false;
  }

  clearElements(pageNumber: number): void {
    const page = this.getPage(pageNumber);
    if (!page) return;
    page.elements = [];
    this.touch();
  }

  deleteElement(elementId: string): PDFElement | null {
    for (const page of this.model.pages) {
      const idx = page.elements.findIndex((e) => e.id === elementId);
      if (idx !== -1) {
        const [removed] = page.elements.splice(idx, 1);
        this.touch();
        return removed;
      }
    }
    return null;
  }

  moveElement(elementId: string, x: number, y: number): void {
    this.updateElement(elementId, { x, y });
  }

  resizeElement(elementId: string, width: number, height: number): void {
    this.updateElement(elementId, { width, height });
  }

  rotateElement(elementId: string, rotation: number): void {
    this.updateElement(elementId, { rotation });
  }

  // ─── Helpers ───────────────────────────────────────────────

  private touch(): void {
    this.model.updatedAt = Date.now();
  }

  clear(): void {
    this.model.pages = [];
    this.model.totalPages = 0;
    this.touch();
  }

  toJSON(): string {
    return JSON.stringify(this.model, null, 2);
  }

  static fromJSON(json: string): PDFDocumentModel {
    const model = new PDFDocumentModel();
    model.model = JSON.parse(json);
    return model;
  }
}
