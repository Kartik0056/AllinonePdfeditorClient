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
 * Resolves accurate font family, clean family name, bold weight, and italic style
 * from PDF.js fontName, styles, and commonObjs.
 */
export function resolvePDFFont(
  fontName: string,
  commonObjs?: any,
  styleFamily?: string
): {
  fontFamily: string;
  cleanFamilyName: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
} {
  let fontObj: any = null;
  if (commonObjs) {
    if (typeof commonObjs.get === 'function') {
      fontObj = commonObjs.get(fontName);
    } else if (commonObjs[fontName]) {
      fontObj = commonObjs[fontName];
    }
  }

  const rawName = (fontObj?.name || fontName || '').trim();
  // Strip 6-letter subset prefix (e.g. 'AAAAAA+Roboto-Regular' -> 'Roboto-Regular')
  const strippedName = rawName.replace(/^[A-Z]{6}\+/, '');
  const lower = strippedName.toLowerCase();

  // Detect bold: check flags, name substrings, or CSS weight
  const isBold = Boolean(
    fontObj?.bold ||
    fontObj?.black ||
    /bold|black|heavy|w[7-9]|700|800|900/i.test(strippedName) ||
    /bold|black|heavy/i.test(fontName)
  );

  // Detect italic
  const isItalic = Boolean(
    fontObj?.italic ||
    /italic|oblique|slant/i.test(strippedName) ||
    /italic|oblique/i.test(fontName)
  );

  // Map known typeface families to real font families with appropriate fallbacks
  let cleanFamily = 'sans-serif';

  if (lower.includes('times') || lower.includes('georgia') || lower.includes('cambria') || lower.includes('garamond') || lower.includes('serif')) {
    if (lower.includes('times')) cleanFamily = '"Times New Roman", Times, Georgia, serif';
    else if (lower.includes('georgia')) cleanFamily = 'Georgia, "Times New Roman", serif';
    else if (lower.includes('cambria')) cleanFamily = 'Cambria, Georgia, serif';
    else if (lower.includes('garamond')) cleanFamily = 'Garamond, Georgia, serif';
    else cleanFamily = '"Times New Roman", serif';
  } else if (lower.includes('courier') || lower.includes('mono') || lower.includes('consolas') || lower.includes('menlo')) {
    if (lower.includes('courier')) cleanFamily = '"Courier New", Courier, monospace';
    else if (lower.includes('consolas')) cleanFamily = 'Consolas, monospace';
    else cleanFamily = 'monospace';
  } else if (lower.includes('roboto')) {
    cleanFamily = 'Roboto, system-ui, -apple-system, sans-serif';
  } else if (lower.includes('arial')) {
    cleanFamily = 'Arial, Helvetica, sans-serif';
  } else if (lower.includes('calibri')) {
    cleanFamily = 'Calibri, Arial, sans-serif';
  } else if (lower.includes('helvetica')) {
    cleanFamily = 'Helvetica, Arial, sans-serif';
  } else if (lower.includes('verdana')) {
    cleanFamily = 'Verdana, Geneva, sans-serif';
  } else if (lower.includes('tahoma')) {
    cleanFamily = 'Tahoma, Verdana, sans-serif';
  } else if (lower.includes('trebuchet')) {
    cleanFamily = '"Trebuchet MS", sans-serif';
  } else if (lower.includes('open sans') || lower.includes('opensans')) {
    cleanFamily = '"Open Sans", sans-serif';
  } else if (lower.includes('lato')) {
    cleanFamily = 'Lato, sans-serif';
  } else if (lower.includes('montserrat')) {
    cleanFamily = 'Montserrat, sans-serif';
  } else if (lower.includes('poppins')) {
    cleanFamily = 'Poppins, sans-serif';
  } else if (lower.includes('inter')) {
    cleanFamily = 'Inter, sans-serif';
  } else if (strippedName.length > 0) {
    const base = strippedName
      .replace(/[-_,](Bold|Italic|Regular|Roman|Medium|Light|Black|SemiBold|Oblique|MT|PSMT|PS|W\d+)/gi, '')
      .replace(/(Bold|Italic|Regular|Roman|Medium|Light|Black|SemiBold|Oblique|MT|PSMT)$/gi, '')
      .trim();
    const fallback = styleFamily || (lower.includes('serif') ? 'serif' : 'sans-serif');
    cleanFamily = base ? `"${base}", ${fallback}` : fallback;
  } else {
    cleanFamily = styleFamily || 'sans-serif';
  }

  // Loaded font name from PDF.js (e.g. 'g_d0_f1')
  const loadedName = fontObj?.loadedName || fontName;
  const fullFontFamily = loadedName ? `"${loadedName}", ${cleanFamily}` : cleanFamily;

  return {
    fontFamily: fullFontFamily,
    cleanFamilyName: cleanFamily.split(',')[0].replace(/"/g, '').trim(),
    fontWeight: isBold ? 'bold' : 'normal',
    fontStyle: isItalic ? 'italic' : 'normal',
  };
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
    pageHeight: number,
    commonObjs?: any
  ): TextElement[] {
    const elements: TextElement[] = [];

    for (const item of textContent.items) {
      if (!item.str || item.str.trim().length === 0) continue;

      const { x, y, scaleX, scaleY, rotation } = parseTransformMatrix(item.transform);
      const fontSize = Math.abs(scaleY) || Math.abs(scaleX) || 12;
      const style = textContent.styles[item.fontName] || ({} as any);

      // Convert PDF coordinates (origin bottom-left) to screen coordinates (origin top-left)
      const screenY = pageHeight - y;

      const fontMeta = resolvePDFFont(item.fontName, commonObjs, style.fontFamily);

      const element: TextElement = {
        id: generateId(),
        type: 'text',
        page: pageNumber,
        text: item.str,
        x: x,
        y: screenY - fontSize, // Adjust for text baseline
        width: item.width || item.str.length * fontSize * 0.6,
        height: fontSize * 1.3,
        fontFamily: fontMeta.fontFamily,
        fontSize: Math.round(fontSize * 10) / 10,
        fontWeight: fontMeta.fontWeight,
        fontStyle: fontMeta.fontStyle,
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
}

