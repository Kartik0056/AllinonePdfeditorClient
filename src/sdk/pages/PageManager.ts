/**
 * PDF Editor SDK - Page Manager
 * Handles page-level operations: add, delete, duplicate, rotate, reorder, extract.
 */

import { PDFDocument, degrees } from 'pdf-lib';
import type { PageInfo } from '@pdfeditor/shared';

/**
 * Manages PDF page operations using pdf-lib.
 */
export class PageManager {
  /**
   * Add a blank page to the document.
   */
  addBlankPage(
    pdfDoc: PDFDocument,
    width: number = 595.28,
    height: number = 841.89,
    insertIndex?: number
  ): void {
    if (insertIndex !== undefined && insertIndex < pdfDoc.getPageCount()) {
      pdfDoc.insertPage(insertIndex, [width, height]);
    } else {
      pdfDoc.addPage([width, height]);
    }
  }

  /**
   * Delete a page by index (0-based).
   */
  deletePage(pdfDoc: PDFDocument, pageIndex: number): void {
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
      throw new Error(`Invalid page index: ${pageIndex}`);
    }
    if (pdfDoc.getPageCount() <= 1) {
      throw new Error('Cannot delete the last page');
    }
    pdfDoc.removePage(pageIndex);
  }

  /**
   * Duplicate a page.
   */
  async duplicatePage(pdfDoc: PDFDocument, pageIndex: number): Promise<void> {
    if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
      throw new Error(`Invalid page index: ${pageIndex}`);
    }

    const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageIndex]);
    // Insert after the original
    if (pageIndex + 1 < pdfDoc.getPageCount()) {
      pdfDoc.insertPage(pageIndex + 1, copiedPage);
    } else {
      pdfDoc.addPage(copiedPage);
    }
  }

  /**
   * Rotate a page by given degrees (90, 180, 270, -90).
   */
  rotatePage(pdfDoc: PDFDocument, pageIndex: number, rotationDegrees: number): void {
    const page = pdfDoc.getPages()[pageIndex];
    if (!page) throw new Error(`Invalid page index: ${pageIndex}`);

    const currentRotation = page.getRotation().angle;
    const newRotation = (currentRotation + rotationDegrees) % 360;
    page.setRotation(degrees(newRotation >= 0 ? newRotation : newRotation + 360));
  }

  /**
   * Extract specific pages into a new PDF document.
   */
  async extractPages(pdfDoc: PDFDocument, pageIndices: number[]): Promise<PDFDocument> {
    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(pdfDoc, pageIndices);

    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    return newDoc;
  }

  /**
   * Reorder pages according to new index mapping.
   * @param newOrder Array where newOrder[newIndex] = oldIndex
   */
  async reorderPages(pdfDoc: PDFDocument, newOrder: number[]): Promise<PDFDocument> {
    if (newOrder.length !== pdfDoc.getPageCount()) {
      throw new Error('New order must have same number of pages');
    }

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(pdfDoc, newOrder);

    for (const page of copiedPages) {
      newDoc.addPage(page);
    }

    return newDoc;
  }

  /**
   * Replace a page with another page from a different PDF.
   */
  async replacePage(
    targetDoc: PDFDocument,
    targetPageIndex: number,
    sourceDoc: PDFDocument,
    sourcePageIndex: number = 0
  ): Promise<void> {
    const [copiedPage] = await targetDoc.copyPages(sourceDoc, [sourcePageIndex]);
    targetDoc.removePage(targetPageIndex);
    targetDoc.insertPage(targetPageIndex, copiedPage);
  }

  /**
   * Get page information.
   */
  getPageInfo(pdfDoc: PDFDocument): PageInfo[] {
    return pdfDoc.getPages().map((page, index) => {
      const { width, height } = page.getSize();
      return {
        pageNumber: index + 1,
        width,
        height,
        rotation: page.getRotation().angle,
        elements: [],
      };
    });
  }
}
