/**
 * PDF Editor SDK - Text Extractor
 * Extracts text elements from PDF pages using PDF.js getTextContent().
 * This module is designed to work in browser environments where pdfjs-dist is available.
 */

import type { TextElement } from '@pdfeditor/shared';
import { generateId, parseTransformMatrix } from '../utils/helpers';

/**
 * Raw text item from PDF.js getTextContent().
 * We define this interface to avoid directly depending on pdfjs-dist types
 * in the SDK (pdfjs-dist is a peer dependency loaded by the frontend).
 */
export interface PDFJSTextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
}

export interface PDFJSTextContent {
  items: PDFJSTextItem[];
  styles: Record<string, { fontFamily: string; ascent: number; descent: number; vertical: boolean }>;
}

/**
 * Extracts text elements from PDF.js text content results.
 * Maps PDF coordinate system to our TextElement model.
 */
export class TextExtractor {
  /**
   * Convert PDF.js text content into our TextElement model.
   * Groups nearby text items into logical text blocks.
   */
  extractTextElements(
    textContent: PDFJSTextContent,
    pageNumber: number,
    pageHeight: number
  ): TextElement[] {
    const elements: TextElement[] = [];

    for (const item of textContent.items) {
      if (!item.str || item.str.trim().length === 0) continue;

      const { x, y, scaleX, scaleY, rotation } = parseTransformMatrix(item.transform);
      const fontSize = Math.abs(scaleY) || Math.abs(scaleX) || 12;
      const style = textContent.styles[item.fontName] || {};

      // Convert PDF coordinates (origin bottom-left) to screen coordinates (origin top-left)
      const screenY = pageHeight - y;

      const element: TextElement = {
        id: generateId(),
        type: 'text',
        page: pageNumber,
        text: item.str,
        x: x,
        y: screenY - fontSize, // Adjust for text baseline
        width: item.width || item.str.length * fontSize * 0.6,
        height: fontSize * 1.3,
        fontFamily: style.fontFamily || 'Helvetica',
        fontSize: Math.round(fontSize * 10) / 10,
        fontWeight: this.detectFontWeight(item.fontName),
        fontStyle: this.detectFontStyle(item.fontName),
        textDecoration: 'none',
        color: '#000000',
        backgroundColor: 'transparent',
        textAlign: 'left',
        lineHeight: 1.2,
        rotation: rotation || 0,
        opacity: 1,
        locked: false,
        visible: true,
        isOriginal: true,
        updatedAt: Date.now(),
        isOCR: false,
      };

      elements.push(element);
    }

    return this.groupTextElements(elements, pageHeight);
  }

  /**
   * Group nearby text items into logical text blocks.
   * Text items on the same line (similar y-coordinate) are merged.
   */
  private groupTextElements(elements: TextElement[], pageHeight: number): TextElement[] {
    if (elements.length === 0) return [];

    // Sort by position: top-to-bottom, left-to-right
    const sorted = [...elements].sort((a, b) => {
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) < 2) return a.x - b.x;
      return yDiff;
    });

    const grouped: TextElement[] = [];
    let currentGroup: TextElement[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const lastInGroup = currentGroup[currentGroup.length - 1];

      // Check if this item is on the same line (similar y) and close horizontally
      const sameLine = Math.abs(current.y - lastInGroup.y) < lastInGroup.fontSize * 0.5;
      const closeHorizontally = current.x - (lastInGroup.x + lastInGroup.width) < lastInGroup.fontSize * 2;
      const sameFont = current.fontFamily === lastInGroup.fontFamily &&
        Math.abs(current.fontSize - lastInGroup.fontSize) < 1;

      if (sameLine && closeHorizontally && sameFont) {
        currentGroup.push(current);
      } else {
        grouped.push(this.mergeGroup(currentGroup));
        currentGroup = [current];
      }
    }

    if (currentGroup.length > 0) {
      grouped.push(this.mergeGroup(currentGroup));
    }

    return grouped;
  }

  /**
   * Merge a group of text items into a single TextElement.
   */
  private mergeGroup(group: TextElement[]): TextElement {
    if (group.length === 1) return group[0];

    const first = group[0];
    const last = group[group.length - 1];

    // Calculate gap-aware merged text
    let mergedText = first.text;
    for (let i = 1; i < group.length; i++) {
      const gap = group[i].x - (group[i - 1].x + group[i - 1].width);
      if (gap > group[i].fontSize * 0.3) {
        mergedText += ' ';
      }
      mergedText += group[i].text;
    }

    return {
      ...first,
      text: mergedText,
      width: (last.x + last.width) - first.x,
    };
  }

  /**
   * Detect font weight from PDF.js font name.
   */
  private detectFontWeight(fontName: string): 'normal' | 'bold' {
    const lower = fontName.toLowerCase();
    if (lower.includes('bold') || lower.includes('black') || lower.includes('heavy')) {
      return 'bold';
    }
    return 'normal';
  }

  /**
   * Detect font style from PDF.js font name.
   */
  private detectFontStyle(fontName: string): 'normal' | 'italic' {
    const lower = fontName.toLowerCase();
    if (lower.includes('italic') || lower.includes('oblique') || lower.includes('slant')) {
      return 'italic';
    }
    return 'normal';
  }
}
