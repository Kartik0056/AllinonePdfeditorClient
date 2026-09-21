/**
 * PDF Editor SDK - Main PDFEditor Class
 * This is the primary public API for the SDK.
 * All PDF operations are accessed through this class.
 */

import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
} from 'pdf-lib';
import type {
  TextElement,
  ImageElement,
  ShapeElement,
  AnnotationElement,
  SignatureElement,
  DrawingElement,
  PDFElement,
  PDFMetadata,
  PageInfo,
  ShapeType,
  AnnotationType,
  DocumentModel,
} from '@pdfeditor/shared';
import { DEFAULT_TEXT_PROPS } from '@pdfeditor/shared';
import { PDFDocumentModel } from './DocumentModel';
import { PDFParser, ParsedPDF } from '../parser/PDFParser';
import { ContentStreamParser } from '../parser/ContentStreamParser';
import { TextExtractor, PDFJSTextContent } from '../text/TextExtractor';
import { ImageHandler } from '../images/ImageHandler';
import { PageManager } from '../pages/PageManager';
import { AnnotationManager } from '../annotations/AnnotationManager';
import { PDFMerger, MergeInput } from '../merge/PDFMerger';
import { PDFSplitter, SplitResult } from '../split/PDFSplitter';
import { PDFExporter } from '../export/PDFExporter';
import { MetadataManager } from '../metadata/MetadataManager';
import { HistoryManager, CommandData } from '../history/HistoryManager';
import { generateId, deepClone } from '../utils/helpers';

/**
 * Main PDF Editor SDK class.
 * Provides a clean API for all PDF operations.
 *
 * @example
 * ```ts
 * const editor = new PDFEditor();
 * await editor.load(fileBytes);
 * editor.addText(1, { text: "Hello World", x: 100, y: 100, fontSize: 18 });
 * const pdfBytes = await editor.export();
 * ```
 */
export class PDFEditor {
  private parser: PDFParser;
  private contentParser: ContentStreamParser;
  private textExtractor: TextExtractor;
  private imageHandler: ImageHandler;
  private pageManager: PageManager;
  private annotationManager: AnnotationManager;
  private merger: PDFMerger;
  private splitter: PDFSplitter;
  private exporter: PDFExporter;
  private metadataManager: MetadataManager;
  private history: HistoryManager;
  private documentModel: PDFDocumentModel;
  private parsedPDF: ParsedPDF | null = null;
  private originalBytes: Uint8Array | null = null;

  constructor() {
    this.parser = new PDFParser();
    this.contentParser = new ContentStreamParser();
    this.textExtractor = new TextExtractor();
    this.imageHandler = new ImageHandler();
    this.pageManager = new PageManager();
    this.annotationManager = new AnnotationManager();
    this.merger = new PDFMerger();
    this.splitter = new PDFSplitter();
    this.exporter = new PDFExporter();
    this.metadataManager = new MetadataManager();
    this.history = new HistoryManager();
    this.documentModel = new PDFDocumentModel();
  }

  // ─── Loading ───────────────────────────────────────────────

  /**
   * Load a PDF from bytes.
   */
  async load(data: Uint8Array | ArrayBuffer, password?: string): Promise<DocumentModel> {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.originalBytes = bytes;
    this.parsedPDF = await this.parser.parse(bytes, password);
    this.history.clear();

    // Build document model from parsed PDF
    this.documentModel = new PDFDocumentModel();
    this.documentModel.setOriginalSize(bytes.length);
    this.documentModel.setMetadata(this.parsedPDF.metadata);

    for (let i = 0; i < this.parsedPDF.pages.length; i++) {
      const page = this.parsedPDF.pages[i];
      this.documentModel.addPage({
        pageNumber: page.pageNumber,
        originalPageIndex: i,
        width: page.width,
        height: page.height,
        rotation: page.rotation,
      });
    }

    return this.documentModel.getModel();
  }

  /**
   * Create a new blank PDF document.
   */
  async createBlank(width: number = 595.28, height: number = 841.89): Promise<DocumentModel> {
    this.parsedPDF = await this.parser.createBlank(width, height);
    this.originalBytes = this.parsedPDF.originalBytes;
    this.history.clear();

    this.documentModel = new PDFDocumentModel();
    this.documentModel.setOriginalSize(this.originalBytes.length);
    this.documentModel.addPage({
      pageNumber: 1,
      originalPageIndex: 0,
      width,
      height,
      rotation: 0,
    });

    return this.documentModel.getModel();
  }

  /**
   * Check if a PDF is loaded.
   */
  isLoaded(): boolean {
    return this.parsedPDF !== null;
  }

  /**
   * Clear loaded document and editor state.
   */
  clear(): void {
    this.parsedPDF = null;
    this.originalBytes = null;
    this.history.clear();
    this.documentModel.clear();
  }

  /**
   * Close document (alias to clear).
   */
  close(): void {
    this.clear();
  }

  // ─── Page Queries ──────────────────────────────────────────

  /**
   * Get all pages.
   */
  getPages(): PageInfo[] {
    return this.documentModel.getPages();
  }

  /**
   * Get a specific page.
   */
  getPage(pageNumber: number): PageInfo | null {
    return this.documentModel.getPage(pageNumber);
  }

  /**
   * Get total page count.
   */
  getPageCount(): number {
    return this.documentModel.getPageCount();
  }

  /**
   * Get the document model.
   */
  getDocument(): DocumentModel {
    return this.documentModel.getModel();
  }

  /**
   * Get original PDF bytes.
   */
  getOriginalBytes(): Uint8Array | null {
    return this.originalBytes;
  }

  // ─── Text Operations ──────────────────────────────────────

  /**
   * Set extracted text elements for a page.
   * Called by the frontend after using PDF.js getTextContent().
   */
  setTextElements(pageNumber: number, textContent: PDFJSTextContent): TextElement[] {
    const page = this.documentModel.getPage(pageNumber);
    if (!page) return [];

    const elements = this.textExtractor.extractTextElements(
      textContent,
      pageNumber,
      page.height
    );

    // Add to document model
    for (const el of elements) {
      this.documentModel.addElement(pageNumber, el);
    }

    return elements;
  }

  /**
   * Get text elements for a page.
   */
  getTextElements(pageNumber: number): TextElement[] {
    return this.documentModel.getTextElements(pageNumber);
  }

  /**
   * Edit an existing text element.
   */
  editText(elementId: string, updates: Partial<TextElement>): TextElement | null {
    const original = this.documentModel.getElement(elementId) as TextElement;
    if (!original || original.type !== 'text') return null;

    const previousState = deepClone(original);
    const origBounds = (original as any).originalBounds || {
      x: original.x,
      y: original.y,
      width: original.width,
      height: original.height,
    };
    const origText = (original as any).originalText || original.text;

    this.history.execute({
      type: 'EDIT_TEXT',
      description: `Edit text "${original.text.substring(0, 20)}..."`,
      execute: () => {
        this.documentModel.updateElement(elementId, {
          ...updates,
          isEdited: true,
          originalBounds: origBounds,
          originalText: origText,
        } as any);
      },
      undo: () => {
        this.documentModel.updateElement(elementId, previousState);
      },
    });

    return this.documentModel.getElement(elementId) as TextElement;
  }

  /**
   * Add new text to a page.
   */
  addText(
    pageNumber: number,
    options: {
      text: string;
      x: number;
      y: number;
      fontSize?: number;
      fontFamily?: string;
      color?: string;
      fontWeight?: 'normal' | 'bold';
      fontStyle?: 'normal' | 'italic';
    }
  ): TextElement {
    const element: TextElement = {
      id: generateId(),
      type: 'text',
      page: pageNumber,
      text: options.text,
      x: options.x,
      y: options.y,
      width: options.text.length * (options.fontSize || DEFAULT_TEXT_PROPS.fontSize) * 0.6,
      height: (options.fontSize || DEFAULT_TEXT_PROPS.fontSize) * 1.3,
      fontFamily: options.fontFamily || DEFAULT_TEXT_PROPS.fontFamily,
      fontSize: options.fontSize || DEFAULT_TEXT_PROPS.fontSize,
      fontWeight: options.fontWeight || DEFAULT_TEXT_PROPS.fontWeight,
      fontStyle: options.fontStyle || DEFAULT_TEXT_PROPS.fontStyle,
      textDecoration: DEFAULT_TEXT_PROPS.textDecoration,
      color: options.color || DEFAULT_TEXT_PROPS.color,
      backgroundColor: DEFAULT_TEXT_PROPS.backgroundColor,
      textAlign: DEFAULT_TEXT_PROPS.textAlign,
      lineHeight: DEFAULT_TEXT_PROPS.lineHeight,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      isOriginal: false,
      updatedAt: Date.now(),
      isOCR: false,
    };

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: `Add text "${options.text.substring(0, 20)}"`,
      execute: () => {
        this.documentModel.addElement(pageNumber, element);
      },
      undo: () => {
        this.documentModel.deleteElement(element.id);
      },
    });

    return element;
  }

  /**
   * Search for text across pages or on a specific page.
   */
  searchText(
    query: string,
    options: { pageNumber?: number; caseSensitive?: boolean } = {}
  ): Array<{ page: number; element: TextElement; matchIndex: number }> {
    if (!query || query.trim().length === 0) return [];

    const pages = options.pageNumber
      ? [this.documentModel.getPage(options.pageNumber)].filter(Boolean) as PageInfo[]
      : this.documentModel.getPages();

    const results: Array<{ page: number; element: TextElement; matchIndex: number }> = [];
    const normalizedQuery = options.caseSensitive ? query : query.toLowerCase();

    for (const page of pages) {
      const textEls = this.documentModel.getTextElements(page.pageNumber);
      for (const el of textEls) {
        const textToSearch = options.caseSensitive ? el.text : el.text.toLowerCase();
        let idx = textToSearch.indexOf(normalizedQuery);
        while (idx !== -1) {
          results.push({ page: page.pageNumber, element: el, matchIndex: idx });
          idx = textToSearch.indexOf(normalizedQuery, idx + 1);
        }
      }
    }

    return results;
  }

  /**
   * Replace text in a specific text element.
   */
  replaceText(elementId: string, newText: string): TextElement | null {
    return this.editText(elementId, { text: newText });
  }

  /**
   * Find and replace all occurrences of text across the document.
   */
  replaceAllText(
    findText: string,
    replaceWith: string,
    options: { caseSensitive?: boolean } = {}
  ): number {
    const matches = this.searchText(findText, options);
    if (matches.length === 0) return 0;

    let count = 0;
    const handledElements = new Set<string>();

    for (const match of matches) {
      if (handledElements.has(match.element.id)) continue;
      handledElements.add(match.element.id);

      const regex = new RegExp(
        findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        options.caseSensitive ? 'g' : 'gi'
      );
      const updated = match.element.text.replace(regex, replaceWith);
      this.editText(match.element.id, { text: updated });
      count++;
    }

    return count;
  }

  // ─── Image Operations ──────────────────────────────────────

  /**
   * Add an image to a page.
   */
  addImage(
    pageNumber: number,
    imageData: string,
    options: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      format?: 'jpg' | 'jpeg' | 'png' | 'webp';
    } = {}
  ): ImageElement {
    const element = this.imageHandler.createImageElement(
      pageNumber,
      imageData,
      options.format || 'png',
      options
    );

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: 'Add image',
      execute: () => {
        this.documentModel.addElement(pageNumber, element);
      },
      undo: () => {
        this.documentModel.deleteElement(element.id);
      },
    });

    return element;
  }

  // ─── Annotation Operations ─────────────────────────────────

  /**
   * Add a highlight annotation.
   */
  addHighlight(
    pageNumber: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color?: string
  ): AnnotationElement {
    const element = this.annotationManager.createHighlight(pageNumber, x, y, width, height, color);

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: 'Add highlight',
      execute: () => this.documentModel.addElement(pageNumber, element),
      undo: () => this.documentModel.deleteElement(element.id),
    });

    return element;
  }

  /**
   * Add a shape.
   */
  addShape(
    pageNumber: number,
    shapeType: ShapeType,
    x: number,
    y: number,
    width: number,
    height: number,
    options?: Partial<ShapeElement>
  ): ShapeElement {
    const element = this.annotationManager.createShape(
      pageNumber, shapeType, x, y, width, height, options
    );

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: `Add ${shapeType}`,
      execute: () => this.documentModel.addElement(pageNumber, element),
      undo: () => this.documentModel.deleteElement(element.id),
    });

    return element;
  }

  /**
   * Add a freehand drawing.
   */
  addFreehand(
    pageNumber: number,
    paths: { x: number; y: number }[],
    color?: string,
    strokeWidth?: number
  ): AnnotationElement {
    const element = this.annotationManager.createFreehand(pageNumber, paths, color, strokeWidth);

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: 'Add freehand drawing',
      execute: () => this.documentModel.addElement(pageNumber, element),
      undo: () => this.documentModel.deleteElement(element.id),
    });

    return element;
  }

  /**
   * Add a sticky note.
   */
  addStickyNote(
    pageNumber: number,
    x: number,
    y: number,
    content: string,
    color?: string
  ): AnnotationElement {
    const element = this.annotationManager.createStickyNote(pageNumber, x, y, content, color);

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: 'Add sticky note',
      execute: () => this.documentModel.addElement(pageNumber, element),
      undo: () => this.documentModel.deleteElement(element.id),
    });

    return element;
  }

  /**
   * Add a signature.
   */
  addSignature(
    pageNumber: number,
    signatureData: string,
    options: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      source?: 'draw' | 'upload';
    } = {}
  ): SignatureElement {
    const element: SignatureElement = {
      id: generateId(),
      type: 'signature',
      page: pageNumber,
      x: options.x ?? 100,
      y: options.y ?? 100,
      width: options.width ?? 200,
      height: options.height ?? 80,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      isOriginal: false,
      updatedAt: Date.now(),
      signatureData,
      source: options.source || 'draw',
    };

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: 'Add signature',
      execute: () => this.documentModel.addElement(pageNumber, element),
      undo: () => this.documentModel.deleteElement(element.id),
    });

    return element;
  }

  /**
   * Add an underline annotation.
   */
  addUnderline(
    pageNumber: number,
    x: number,
    y: number,
    width: number,
    color?: string
  ): AnnotationElement {
    const element = this.annotationManager.createUnderline(pageNumber, x, y, width, color);

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: 'Add underline',
      execute: () => this.documentModel.addElement(pageNumber, element),
      undo: () => this.documentModel.deleteElement(element.id),
    });

    return element;
  }

  /**
   * Add a strikethrough annotation.
   */
  addStrikethrough(
    pageNumber: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color?: string
  ): AnnotationElement {
    const element = this.annotationManager.createStrikethrough(pageNumber, x, y, width, height, color);

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: 'Add strikethrough',
      execute: () => this.documentModel.addElement(pageNumber, element),
      undo: () => this.documentModel.deleteElement(element.id),
    });

    return element;
  }

  /**
   * Add a drawing element (pen tool).
   */
  addDrawing(
    pageNumber: number,
    paths: { x: number; y: number }[],
    color?: string,
    strokeWidth?: number
  ): DrawingElement {
    const element = this.annotationManager.createDrawing(pageNumber, paths, color, strokeWidth);

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: 'Add drawing',
      execute: () => this.documentModel.addElement(pageNumber, element),
      undo: () => this.documentModel.deleteElement(element.id),
    });

    return element;
  }

  /**
   * Get all annotation elements on a page.
   */
  getAnnotations(pageNumber: number): AnnotationElement[] {
    return this.documentModel.getAnnotationElements(pageNumber);
  }

  /**
   * Get all shape elements on a page.
   */
  getShapes(pageNumber: number): ShapeElement[] {
    return this.documentModel.getShapeElements(pageNumber);
  }

  /**
   * Get all image elements on a page.
   */
  getImageElements(pageNumber: number): ImageElement[] {
    return this.documentModel.getImageElements(pageNumber);
  }

  // ─── Element Operations ────────────────────────────────────

  /**
   * Delete an element.
   */
  deleteElement(elementId: string): boolean {
    const element = this.documentModel.getElement(elementId);
    if (!element) return false;

    const clone = deepClone(element);

    this.history.execute({
      type: 'DELETE_ELEMENT',
      description: `Delete ${element.type}`,
      execute: () => {
        if (element.isOriginal) {
          const page = this.documentModel.getPage(element.page);
          if (page) {
            (page as any).deletedOriginals = (page as any).deletedOriginals || [];
            (page as any).deletedOriginals.push({
              x: element.x,
              y: element.y,
              width: element.width,
              height: element.height,
            });
          }
        }
        this.documentModel.deleteElement(elementId);
      },
      undo: () => this.documentModel.addElement(clone.page, clone),
    });

    return true;
  }

  /**
   * Move an element.
   */
  moveElement(elementId: string, x: number, y: number): void {
    const element = this.documentModel.getElement(elementId);
    if (!element) return;

    const prevX = element.x;
    const prevY = element.y;

    this.history.execute({
      type: 'MOVE_ELEMENT',
      description: `Move ${element.type}`,
      execute: () => this.documentModel.moveElement(elementId, x, y),
      undo: () => this.documentModel.moveElement(elementId, prevX, prevY),
    });
  }

  /**
   * Resize an element.
   */
  resizeElement(elementId: string, width: number, height: number): void {
    const element = this.documentModel.getElement(elementId);
    if (!element) return;

    const prevW = element.width;
    const prevH = element.height;

    this.history.execute({
      type: 'RESIZE_ELEMENT',
      description: `Resize ${element.type}`,
      execute: () => this.documentModel.resizeElement(elementId, width, height),
      undo: () => this.documentModel.resizeElement(elementId, prevW, prevH),
    });
  }

  /**
   * Rotate an element.
   */
  rotateElement(elementId: string, rotation: number): void {
    const element = this.documentModel.getElement(elementId);
    if (!element) return;

    const prevRotation = element.rotation;

    this.history.execute({
      type: 'ROTATE_ELEMENT',
      description: `Rotate ${element.type}`,
      execute: () => this.documentModel.rotateElement(elementId, rotation),
      undo: () => this.documentModel.rotateElement(elementId, prevRotation),
    });
  }

  /**
   * Get an element by ID.
   */
  getElement(elementId: string): PDFElement | null {
    return this.documentModel.getElement(elementId);
  }

  /**
   * Get all elements on a page.
   */
  getElements(pageNumber: number): PDFElement[] {
    return this.documentModel.getElements(pageNumber);
  }

  /**
   * Update any element properties with undo/redo support.
   */
  updateElement(elementId: string, updates: Partial<PDFElement>): PDFElement | null {
    const original = this.documentModel.getElement(elementId);
    if (!original) return null;

    const previousState = deepClone(original);

    this.history.execute({
      type: 'EDIT_PROPERTIES',
      description: `Update ${original.type} properties`,
      execute: () => {
        this.documentModel.updateElement(elementId, updates);
      },
      undo: () => {
        this.documentModel.updateElement(elementId, previousState);
      },
    });

    return this.documentModel.getElement(elementId);
  }

  /**
   * Duplicate an element with offset.
   */
  duplicateElement(elementId: string, offsetX: number = 20, offsetY: number = 20): PDFElement | null {
    const original = this.documentModel.getElement(elementId);
    if (!original) return null;

    let createdId: string | null = null;

    this.history.execute({
      type: 'ADD_ELEMENT',
      description: `Duplicate ${original.type}`,
      execute: () => {
        const cloned = this.documentModel.duplicateElement(elementId, offsetX, offsetY);
        if (cloned) createdId = cloned.id;
      },
      undo: () => {
        if (createdId) this.documentModel.deleteElement(createdId);
      },
    });

    return createdId ? this.documentModel.getElement(createdId) : null;
  }

  /**
   * Bring element forward in layer stack.
   */
  bringForward(elementId: string): boolean {
    return this.documentModel.bringForward(elementId);
  }

  /**
   * Send element backward in layer stack.
   */
  sendBackward(elementId: string): boolean {
    return this.documentModel.sendBackward(elementId);
  }

  /**
   * Bring element to top of layer stack.
   */
  bringToFront(elementId: string): boolean {
    return this.documentModel.bringToFront(elementId);
  }

  /**
   * Send element to bottom of layer stack.
   */
  sendToBack(elementId: string): boolean {
    return this.documentModel.sendToBack(elementId);
  }

  /**
   * Clear all elements from a page.
   */
  clearElements(pageNumber: number): void {
    const previous = this.documentModel.getElements(pageNumber);
    this.history.execute({
      type: 'DELETE_ELEMENT',
      description: `Clear page ${pageNumber} elements`,
      execute: () => this.documentModel.clearElements(pageNumber),
      undo: () => {
        for (const el of previous) {
          this.documentModel.addElement(pageNumber, el);
        }
      },
    });
  }

  // ─── Page Operations ───────────────────────────────────────

  /**
   * Add a blank page.
   */
  addBlankPage(afterPage?: number, width?: number, height?: number): void {
    const currentPage = this.documentModel.getPage(afterPage || this.getPageCount());
    const w = width || currentPage?.width || 595.28;
    const h = height || currentPage?.height || 841.89;

    this.history.execute({
      type: 'ADD_PAGE',
      description: 'Add blank page',
      execute: () => {
        this.documentModel.insertBlankPage(afterPage || this.getPageCount(), w, h);
      },
      undo: () => {
        this.documentModel.deletePage((afterPage || this.getPageCount()) + 1);
      },
    });
  }

  /**
   * Delete a page.
   */
  deletePageFromModel(pageNumber: number): void {
    const page = this.documentModel.getPage(pageNumber);
    if (!page) return;

    const clone = deepClone(page);

    this.history.execute({
      type: 'DELETE_PAGE',
      description: `Delete page ${pageNumber}`,
      execute: () => this.documentModel.deletePage(pageNumber),
      undo: () => {
        // Re-insert page at original position
        this.documentModel.addPage(clone);
      },
    });
  }

  /**
   * Duplicate a page.
   */
  duplicatePageInModel(pageNumber: number): void {
    this.history.execute({
      type: 'ADD_PAGE',
      description: `Duplicate page ${pageNumber}`,
      execute: () => this.documentModel.duplicatePage(pageNumber),
      undo: () => this.documentModel.deletePage(pageNumber + 1),
    });
  }

  /**
   * Rotate a page.
   */
  rotatePageInModel(pageNumber: number, degrees: number): void {
    this.history.execute({
      type: 'ROTATE_PAGE',
      description: `Rotate page ${pageNumber}`,
      execute: () => this.documentModel.rotatePage(pageNumber, degrees),
      undo: () => this.documentModel.rotatePage(pageNumber, -degrees),
    });
  }

  /**
   * Reorder pages.
   */
  reorderPagesInModel(fromIndex: number, toIndex: number): void {
    this.history.execute({
      type: 'REORDER_PAGE',
      description: 'Reorder pages',
      execute: () => this.documentModel.reorderPages(fromIndex, toIndex),
      undo: () => this.documentModel.reorderPages(toIndex, fromIndex),
    });
  }

  /**
   * Delete a page (standard alias).
   */
  deletePage(pageNumber: number): void {
    this.deletePageFromModel(pageNumber);
  }

  /**
   * Duplicate a page (standard alias).
   */
  duplicatePage(pageNumber: number): void {
    this.duplicatePageInModel(pageNumber);
  }

  /**
   * Rotate a page (standard alias).
   */
  rotatePage(pageNumber: number, degrees: number): void {
    this.rotatePageInModel(pageNumber, degrees);
  }

  /**
   * Reorder pages (standard alias).
   */
  reorderPages(fromIndex: number, toIndex: number): void {
    this.reorderPagesInModel(fromIndex, toIndex);
  }

  /**
   * Get rotation of a page.
   */
  getPageRotation(pageNumber: number): number {
    const page = this.documentModel.getPage(pageNumber);
    return page?.rotation || 0;
  }

  /**
   * Set page dimensions.
   */
  setPageSize(pageNumber: number, width: number, height: number): void {
    const page = this.documentModel.getPage(pageNumber);
    if (page) {
      page.width = width;
      page.height = height;
    }
  }

  // ─── Merge & Split ────────────────────────────────────────

  /**
   * Merge multiple PDFs.
   */
  async mergePDFs(
    inputs: Array<{ data: Uint8Array | ArrayBuffer; name?: string }>
  ): Promise<Uint8Array> {
    return this.merger.merge(inputs);
  }

  /**
   * Split every page.
   */
  async splitEveryPage(pdfBytes: Uint8Array | ArrayBuffer) {
    return this.splitter.splitEveryPage(
      pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes)
    );
  }

  /**
   * Split by ranges.
   */
  async splitByRanges(pdfBytes: Uint8Array | ArrayBuffer, ranges: string[]) {
    return this.splitter.splitByRanges(
      pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes),
      ranges
    );
  }

  /**
   * Extract specific pages.
   */
  async extractPages(pdfBytes: Uint8Array | ArrayBuffer, pages: number[]) {
    return this.splitter.extractPages(
      pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes),
      pages
    );
  }

  /**
   * Merge specific pages from multiple PDFs.
   */
  async mergeSelectedPages(
    inputs: Array<{ data: Uint8Array | ArrayBuffer; pages: number[] }>
  ): Promise<Uint8Array> {
    return this.merger.mergeSelectedPages(inputs);
  }

  /**
   * Split currently loaded document into individual pages.
   */
  async splitCurrentEveryPage(): Promise<SplitResult[]> {
    const bytes = await this.export();
    return this.splitter.splitEveryPage(bytes);
  }

  /**
   * Split currently loaded document by ranges.
   */
  async splitCurrentByRanges(ranges: string[]): Promise<SplitResult[]> {
    const bytes = await this.export();
    return this.splitter.splitByRanges(bytes, ranges);
  }

  /**
   * Extract pages from currently loaded document.
   */
  async extractCurrentPages(pages: number[]): Promise<SplitResult> {
    const bytes = await this.export();
    return this.splitter.extractPages(bytes, pages);
  }

  // ─── Metadata ──────────────────────────────────────────────

  /**
   * Get PDF metadata.
   */
  getMetadata(): PDFMetadata {
    return this.documentModel.getMetadata();
  }

  /**
   * Set PDF metadata.
   */
  setMetadata(metadata: Partial<PDFMetadata>): void {
    this.documentModel.setMetadata(metadata);
  }

  setTitle(title: string): void {
    this.setMetadata({ title });
  }

  setAuthor(author: string): void {
    this.setMetadata({ author });
  }

  setSubject(subject: string): void {
    this.setMetadata({ subject });
  }

  setKeywords(keywords: string): void {
    this.setMetadata({ keywords });
  }

  // ─── History (Undo/Redo) ───────────────────────────────────

  undo(): boolean {
    return this.history.undo();
  }

  redo(): boolean {
    return this.history.redo();
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  clearHistory(): void {
    this.history.clear();
  }

  getUndoCount(): number {
    return this.history.getUndoCount();
  }

  getRedoCount(): number {
    return this.history.getRedoCount();
  }

  getUndoDescription(): string | null {
    return this.history.getUndoDescription();
  }

  getRedoDescription(): string | null {
    return this.history.getRedoDescription();
  }

  // ─── Export ────────────────────────────────────────────────

  /**
   * Export the current document with all modifications.
   */
  async export(): Promise<Uint8Array> {
    if (!this.originalBytes) {
      throw new Error('No PDF loaded. Call load() first.');
    }

    return this.exporter.export(this.originalBytes, this.documentModel);
  }

  /**
   * Alias to export().
   */
  async save(): Promise<Uint8Array> {
    return this.export();
  }

  /**
   * Export a single page as a standalone PDF.
   */
  async exportPage(pageNumber: number): Promise<Uint8Array> {
    const bytes = await this.export();
    const result = await this.splitter.extractPages(bytes, [pageNumber]);
    return result.data;
  }

  /**
   * Export as Blob (useful for web browser downloads).
   */
  async exportAsBlob(): Promise<Blob> {
    const bytes = await this.export();
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  }

  /**
   * Trigger browser file download of current document.
   */
  async download(fileName?: string): Promise<void> {
    const blob = await this.exportAsBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || this.documentModel.getModel().fileName || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Export to a new PDFDocument for further manipulation.
   */
  async exportDocument(): Promise<PDFDocument> {
    if (!this.originalBytes) {
      throw new Error('No PDF loaded');
    }
    const bytes = await this.export();
    return PDFDocument.load(bytes);
  }
}
