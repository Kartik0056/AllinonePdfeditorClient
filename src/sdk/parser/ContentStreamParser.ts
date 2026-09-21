/**
 * PDF Editor SDK - Content Stream Parser
 * Parses PDF content streams to identify text operators.
 * This enables real text editing by manipulating the actual PDF content.
 */

import * as pako from 'pako';
import {
  PDFDocument,
  PDFPage,
  PDFRawStream,
  PDFName,
  PDFArray,
  PDFRef,
  PDFDict,
  decodePDFRawStream,
} from 'pdf-lib';

export interface TextOperator {
  /** Index in the content stream where this operator appears */
  index: number;
  /** The operator type: Tj (show string), TJ (show strings with positioning), ' (new line + show) */
  operator: 'Tj' | 'TJ' | "'" | '"';
  /** The raw operand string */
  rawText: string;
  /** Decoded text (best effort) */
  decodedText: string;
  /** Start byte offset in the decompressed stream */
  startOffset: number;
  /** End byte offset in the decompressed stream */
  endOffset: number;
  /** Current font name ref */
  fontRef: string;
  /** Current font size */
  fontSize: number;
  /** Current position from Td/Tm operators */
  position: { x: number; y: number };
}

export interface ContentStreamInfo {
  /** The decompressed stream content as string */
  content: string;
  /** All text operators found */
  textOperators: TextOperator[];
  /** Whether the stream was compressed */
  wasCompressed: boolean;
  /** Reference to the original stream object */
  streamRef: string;
}

/**
 * Parses PDF content streams to find and manipulate text operators.
 */
export class ContentStreamParser {
  /**
   * Extract and parse all content streams from a page.
   */
  parsePageStreams(pdfDoc: PDFDocument, pageIndex: number): ContentStreamInfo[] {
    const results: ContentStreamInfo[] = [];
    const page = pdfDoc.getPages()[pageIndex];
    if (!page) return results;

    const node = page.node;
    const contentsRef = node.get(PDFName.of('Contents'));

    if (!contentsRef) return results;

    try {
      const context = pdfDoc.context;

      if (contentsRef instanceof PDFRef) {
        // Single content stream
        const streamObj = context.lookup(contentsRef);
        if (streamObj instanceof PDFRawStream) {
          const info = this.parseStream(streamObj, contentsRef.toString());
          if (info) results.push(info);
        }
      } else if (contentsRef instanceof PDFArray) {
        // Array of content streams
        for (let i = 0; i < contentsRef.size(); i++) {
          const ref = contentsRef.get(i);
          if (ref instanceof PDFRef) {
            const streamObj = context.lookup(ref);
            if (streamObj instanceof PDFRawStream) {
              const info = this.parseStream(streamObj, ref.toString());
              if (info) results.push(info);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to parse content streams:', error);
    }

    return results;
  }

  /**
   * Parse a single content stream, decompressing if needed.
   */
  private parseStream(stream: PDFRawStream, ref: string): ContentStreamInfo | null {
    try {
      const decoded = decodePDFRawStream(stream);
      let content: string;
      let wasCompressed = false;

      try {
        // Try to decode as string
        const bytes = decoded.decode();
        content = new TextDecoder('latin1').decode(new Uint8Array(bytes));
        wasCompressed = stream.dict.has(PDFName.of('Filter'));
      } catch {
        // If decoding fails, try raw
        const rawBytes = stream.contents;
        try {
          const inflated = pako.inflate(rawBytes);
          content = new TextDecoder('latin1').decode(inflated);
          wasCompressed = true;
        } catch {
          content = new TextDecoder('latin1').decode(rawBytes);
        }
      }

      const textOperators = this.extractTextOperators(content);

      return {
        content,
        textOperators,
        wasCompressed,
        streamRef: ref,
      };
    } catch (error) {
      console.warn(`Failed to parse stream ${ref}:`, error);
      return null;
    }
  }

  /**
   * Extract text operators from a decompressed content stream string.
   * Looks for BT...ET blocks and parses Tj, TJ, ', " operators.
   */
  private extractTextOperators(content: string): TextOperator[] {
    const operators: TextOperator[] = [];
    let currentFont = '';
    let currentFontSize = 12;
    let currentX = 0;
    let currentY = 0;
    let operatorIndex = 0;

    // State tracking
    let inTextBlock = false;

    const lines = content.split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].trim();

      if (line === 'BT') {
        inTextBlock = true;
        continue;
      }
      if (line === 'ET') {
        inTextBlock = false;
        continue;
      }

      if (!inTextBlock) continue;

      // Font selection: /FontName fontSize Tf
      const fontMatch = line.match(/\/(\S+)\s+([\d.]+)\s+Tf/);
      if (fontMatch) {
        currentFont = fontMatch[1];
        currentFontSize = parseFloat(fontMatch[2]);
        continue;
      }

      // Position: x y Td  or  a b c d e f Tm
      const tdMatch = line.match(/([\d.e+-]+)\s+([\d.e+-]+)\s+Td/);
      if (tdMatch) {
        currentX += parseFloat(tdMatch[1]);
        currentY += parseFloat(tdMatch[2]);
        continue;
      }

      const tmMatch = line.match(/([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)\s+Tm/);
      if (tmMatch) {
        currentX = parseFloat(tmMatch[5]);
        currentY = parseFloat(tmMatch[6]);
        currentFontSize = parseFloat(tmMatch[1]) || currentFontSize;
        continue;
      }

      // Text showing: (text) Tj
      const tjMatch = line.match(/\((.+?)\)\s*Tj/);
      if (tjMatch) {
        const startOffset = content.indexOf(line);
        operators.push({
          index: operatorIndex++,
          operator: 'Tj',
          rawText: tjMatch[1],
          decodedText: this.decodeText(tjMatch[1]),
          startOffset,
          endOffset: startOffset + line.length,
          fontRef: currentFont,
          fontSize: currentFontSize,
          position: { x: currentX, y: currentY },
        });
        continue;
      }

      // TJ array: [(text) kern (text) kern ...] TJ
      const tjArrayMatch = line.match(/\[(.+?)\]\s*TJ/);
      if (tjArrayMatch) {
        const arrayContent = tjArrayMatch[1];
        const textParts: string[] = [];

        // Extract all string parts from the array
        const stringMatches = arrayContent.matchAll(/\(([^)]*)\)/g);
        for (const m of stringMatches) {
          textParts.push(m[1]);
        }

        const combinedText = textParts.join('');
        const startOffset = content.indexOf(line);

        operators.push({
          index: operatorIndex++,
          operator: 'TJ',
          rawText: arrayContent,
          decodedText: this.decodeText(combinedText),
          startOffset,
          endOffset: startOffset + line.length,
          fontRef: currentFont,
          fontSize: currentFontSize,
          position: { x: currentX, y: currentY },
        });
        continue;
      }

      // Single-quote operator: (text) '
      const quoteMatch = line.match(/\((.+?)\)\s*'/);
      if (quoteMatch) {
        const startOffset = content.indexOf(line);
        operators.push({
          index: operatorIndex++,
          operator: "'",
          rawText: quoteMatch[1],
          decodedText: this.decodeText(quoteMatch[1]),
          startOffset,
          endOffset: startOffset + line.length,
          fontRef: currentFont,
          fontSize: currentFontSize,
          position: { x: currentX, y: currentY },
        });
      }
    }

    return operators;
  }

  /**
   * Decode PDF text encoding (basic latin1 + escape sequences).
   */
  private decodeText(raw: string): string {
    return raw
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\');
  }

  /**
   * Replace text in a content stream.
   * Returns the modified content string.
   */
  replaceTextInStream(
    content: string,
    operator: TextOperator,
    newText: string
  ): string {
    const escapedNewText = this.encodeText(newText);

    if (operator.operator === 'Tj') {
      // Simple replacement: (oldText) Tj -> (newText) Tj
      const pattern = `(${this.escapeRegex(operator.rawText)}) Tj`;
      const replacement = `(${escapedNewText}) Tj`;
      return content.replace(new RegExp(this.escapeRegex(`(${operator.rawText}) Tj`)), replacement);
    }

    if (operator.operator === 'TJ') {
      // For TJ arrays, replace the entire array with a simple Tj
      const startIdx = operator.startOffset;
      const endIdx = operator.endOffset;
      const originalLine = content.substring(startIdx, endIdx);
      const replacement = `(${escapedNewText}) Tj`;
      return content.replace(originalLine, replacement);
    }

    return content;
  }

  /**
   * Encode text for PDF content stream.
   */
  private encodeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
  }

  /**
   * Escape special regex characters.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Recompress a content stream and update the PDF object.
   */
  recompressStream(
    pdfDoc: PDFDocument,
    streamRef: string,
    newContent: string,
    originalWasCompressed: boolean
  ): void {
    const context = pdfDoc.context;

    // Find the stream object by iterating indirect objects
    context.enumerateIndirectObjects().forEach(([ref, obj]) => {
      if (ref.toString() === streamRef && obj instanceof PDFRawStream) {
        const bytes = new TextEncoder().encode(newContent);

        if (originalWasCompressed) {
          // Recompress with deflate
          const compressed = pako.deflate(bytes);
          (obj as any).contents = compressed;
          obj.dict.set(PDFName.of('Length'), context.obj(compressed.length));
        } else {
          (obj as any).contents = bytes;
          obj.dict.set(PDFName.of('Length'), context.obj(bytes.length));
        }
      }
    });
  }
}
