/**
 * PDF Editor SDK - PDF Exporter
 * Exports the document model back to a PDF with all modifications applied.
 * Uses a hybrid strategy: stream editing for simple text replacement,
 * white-out + redraw fallback for complex cases.
 */

import {
  PDFDocument,
  PDFPage,
  rgb,
  degrees,
  StandardFonts,
  PDFFont,
} from 'pdf-lib';
import type {
  PDFElement,
  TextElement,
  ImageElement,
  ShapeElement,
  AnnotationElement,
  SignatureElement,
  DrawingElement,
  PageInfo,
} from '@pdfeditor/shared';
import { PDFDocumentModel } from '../core/DocumentModel';
import { ContentStreamParser } from '../parser/ContentStreamParser';
import { ImageHandler } from '../images/ImageHandler';
import { hexToRgb, screenToPdf } from '../utils/helpers';

/**
 * Exports the current document model to a final PDF.
 */
export class PDFExporter {
  private contentParser: ContentStreamParser;
  private imageHandler: ImageHandler;

  constructor() {
    this.contentParser = new ContentStreamParser();
    this.imageHandler = new ImageHandler();
  }

  /**
   * Export the document model to PDF bytes.
   * Takes the original PDF and applies all modifications from the model.
   */
  async export(
    originalPdfBytes: Uint8Array,
    documentModel: PDFDocumentModel
  ): Promise<Uint8Array> {
    const srcDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true });
    const model = documentModel.getModel();
    const fontCache: Map<string, PDFFont> = new Map();

    const outDoc = await PDFDocument.create();

    // Copy or create pages in outDoc according to model.pages
    for (let i = 0; i < model.pages.length; i++) {
      const pageInfo = model.pages[i];
      let page: PDFPage;

      // Determine original page index if available
      const origIndex = pageInfo.originalPageIndex !== undefined
        ? pageInfo.originalPageIndex
        : (pageInfo.pageNumber - 1 < srcDoc.getPageCount() ? pageInfo.pageNumber - 1 : undefined);

      if (origIndex !== undefined && origIndex >= 0 && origIndex < srcDoc.getPageCount()) {
        const [copied] = await outDoc.copyPages(srcDoc, [origIndex]);
        page = outDoc.addPage(copied);
      } else {
        // Blank or newly inserted page
        page = outDoc.addPage([pageInfo.width || 595.28, pageInfo.height || 841.89]);
      }

      // Apply rotation if defined
      if (pageInfo.rotation !== undefined && pageInfo.rotation !== null) {
        page.setRotation(degrees(pageInfo.rotation));
      }

      const { height: pageHeight } = page.getSize();

      // 1. White out any deleted original elements
      const deletedOriginals = (pageInfo as any).deletedOriginals as Array<{ x: number; y: number; width: number; height: number }> | undefined;
      if (deletedOriginals && deletedOriginals.length > 0) {
        for (const del of deletedOriginals) {
          const pdfY = pageHeight - del.y - del.height;
          page.drawRectangle({
            x: Math.max(0, del.x - 2),
            y: Math.max(0, pdfY - 2),
            width: del.width + 4,
            height: del.height + 4,
            color: rgb(1, 1, 1),
            borderWidth: 0,
          });
        }
      }

      // 2. Process text edits on existing text (stream manipulation if streamData available)
      await this.applyTextEdits(outDoc, i, pageInfo, pageHeight);

      // 3. Draw new and modified elements
      for (const element of pageInfo.elements) {
        if (element.isOriginal && element.type === 'text') {
          const isEdited = (element as any).isEdited || ((element as any).originalText !== undefined && (element as any).originalText !== element.text);
          if (isEdited) {
            // White out original text position
            const origBounds = (element as any).originalBounds || element;
            const pdfY = pageHeight - origBounds.y - origBounds.height;
            page.drawRectangle({
              x: Math.max(0, origBounds.x - 2),
              y: Math.max(0, pdfY - 2),
              width: origBounds.width + 4,
              height: origBounds.height + 4,
              color: rgb(1, 1, 1),
              borderWidth: 0,
            });
            // Draw updated text
            await this.drawTextElement(outDoc, page, element as TextElement, pageHeight, fontCache);
          }
          continue;
        }

        switch (element.type) {
          case 'text':
            await this.drawTextElement(outDoc, page, element, pageHeight, fontCache);
            break;
          case 'image':
            await this.drawImageElement(outDoc, page, element, pageHeight);
            break;
          case 'shape':
            this.drawShapeElement(page, element, pageHeight);
            break;
          case 'annotation':
            this.drawAnnotationElement(page, element, pageHeight);
            break;
          case 'signature':
            await this.drawSignatureElement(outDoc, page, element, pageHeight);
            break;
          case 'drawing':
            this.drawDrawingElement(page, element, pageHeight);
            break;
        }
      }
    }

    // Apply metadata
    if (model.metadata) {
      const { title, author, subject, creator, producer } = model.metadata;
      if (title) outDoc.setTitle(title);
      if (author) outDoc.setAuthor(author);
      if (subject) outDoc.setSubject(subject);
      if (creator) outDoc.setCreator(creator);
      if (producer) outDoc.setProducer(producer);
    }

    return outDoc.save();
  }

  /**
   * Apply text edits to existing text using content stream manipulation.
   * For modified original text elements, try stream-level replacement first;
   * fall back to white-out + redraw if stream editing fails.
   */
  private async applyTextEdits(
    pdfDoc: PDFDocument,
    pageIndex: number,
    pageInfo: PageInfo,
    pageHeight: number
  ): Promise<void> {
    const editedOriginals = pageInfo.elements.filter(
      (e) => e.type === 'text' && e.isOriginal && (e as TextElement).streamData
    ) as TextElement[];

    if (editedOriginals.length === 0) return;

    // Parse content streams
    const streams = this.contentParser.parsePageStreams(pdfDoc, pageIndex);

    for (const textEl of editedOriginals) {
      if (!textEl.streamData) continue;

      let replaced = false;

      // Try stream-level replacement
      for (const stream of streams) {
        const matchingOp = stream.textOperators.find(
          (op) => op.decodedText === textEl.streamData!.originalText
        );

        if (matchingOp) {
          try {
            const newContent = this.contentParser.replaceTextInStream(
              stream.content,
              matchingOp,
              textEl.text
            );
            this.contentParser.recompressStream(
              pdfDoc,
              stream.streamRef,
              newContent,
              stream.wasCompressed
            );
            replaced = true;
            break;
          } catch {
            // Fall through to white-out method
          }
        }
      }

      // Fallback: white-out original area and draw new text
      if (!replaced) {
        const page = pdfDoc.getPages()[pageIndex];
        const pdfCoords = screenToPdf(textEl.x, textEl.y, pageHeight);

        // White out
        page.drawRectangle({
          x: pdfCoords.x - 1,
          y: pdfCoords.y - textEl.height + 2,
          width: textEl.width + 2,
          height: textEl.height + 2,
          color: rgb(1, 1, 1),
          borderWidth: 0,
        });

        // Draw new text
        const font = await this.getFont(pdfDoc, textEl.fontFamily, new Map());
        const color = hexToRgb(textEl.color);

        page.drawText(textEl.text, {
          x: pdfCoords.x,
          y: pdfCoords.y,
          size: textEl.fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
        });
      }
    }
  }

  /**
   * Draw a new text element on a page.
   */
  private async drawTextElement(
    pdfDoc: PDFDocument,
    page: PDFPage,
    element: TextElement,
    pageHeight: number,
    fontCache: Map<string, PDFFont>
  ): Promise<void> {
    const font = await this.getFont(pdfDoc, element.fontFamily, fontCache);
    const color = hexToRgb(element.color);

    // Convert screen coords to PDF coords
    const pdfY = pageHeight - element.y - element.fontSize;

    const drawOptions: any = {
      x: element.x,
      y: pdfY,
      size: element.fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
      opacity: element.opacity,
    };

    if (element.rotation) {
      drawOptions.rotate = degrees(element.rotation);
    }

    page.drawText(element.text, drawOptions);
  }

  /**
   * Draw an image element on a page.
   */
  private async drawImageElement(
    pdfDoc: PDFDocument,
    page: PDFPage,
    element: ImageElement,
    pageHeight: number
  ): Promise<void> {
    try {
      const format = element.format === 'jpeg' ? 'jpg' : element.format;
      if (format === 'webp') {
        // pdf-lib doesn't support WEBP, skip
        console.warn('WEBP images are not directly embeddable in PDF. Convert to PNG/JPG first.');
        return;
      }

      const image = await this.imageHandler.embedImage(
        pdfDoc,
        element.src,
        format as 'jpg' | 'png'
      );

      this.imageHandler.drawImage(page, image, element, pageHeight);
    } catch (error) {
      console.warn('Failed to embed image:', error);
    }
  }

  /**
   * Draw a shape element on a page.
   */
  private drawShapeElement(
    page: PDFPage,
    element: ShapeElement,
    pageHeight: number
  ): void {
    const pdfY = pageHeight - element.y - element.height;
    const strokeColor = hexToRgb(element.strokeColor);
    const fillColor = element.fillColor !== 'transparent'
      ? hexToRgb(element.fillColor)
      : null;

    const baseOpts = {
      opacity: element.opacity,
      borderWidth: element.strokeWidth,
      borderColor: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
      color: fillColor ? rgb(fillColor.r, fillColor.g, fillColor.b) : undefined,
      rotate: element.rotation ? degrees(element.rotation) : undefined,
    };

    switch (element.shapeType) {
      case 'rectangle':
        page.drawRectangle({
          x: element.x,
          y: pdfY,
          width: element.width,
          height: element.height,
          ...baseOpts,
        });
        break;
      case 'circle':
        page.drawEllipse({
          x: element.x + element.width / 2,
          y: pdfY + element.height / 2,
          xScale: element.width / 2,
          yScale: element.height / 2,
          ...baseOpts,
        });
        break;
      case 'line':
        page.drawLine({
          start: { x: element.x, y: pdfY + element.height },
          end: { x: element.x + element.width, y: pdfY },
          thickness: element.strokeWidth,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          opacity: element.opacity,
        });
        break;
      case 'arrow':
        // Draw line with arrowhead
        const endX = element.x + element.width;
        const endY = pdfY;
        page.drawLine({
          start: { x: element.x, y: pdfY + element.height },
          end: { x: endX, y: endY },
          thickness: element.strokeWidth,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
          opacity: element.opacity,
        });
        // Arrowhead (triangle)
        const angle = Math.atan2(element.height, element.width);
        const headLength = 12;
        page.drawLine({
          start: { x: endX, y: endY },
          end: {
            x: endX - headLength * Math.cos(angle - Math.PI / 6),
            y: endY + headLength * Math.sin(angle - Math.PI / 6),
          },
          thickness: element.strokeWidth,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        });
        page.drawLine({
          start: { x: endX, y: endY },
          end: {
            x: endX - headLength * Math.cos(angle + Math.PI / 6),
            y: endY + headLength * Math.sin(angle + Math.PI / 6),
          },
          thickness: element.strokeWidth,
          color: rgb(strokeColor.r, strokeColor.g, strokeColor.b),
        });
        break;
    }
  }

  /**
   * Draw an annotation element on a page.
   */
  private drawAnnotationElement(
    page: PDFPage,
    element: AnnotationElement,
    pageHeight: number
  ): void {
    const pdfY = pageHeight - element.y - element.height;
    const color = hexToRgb(element.color);

    switch (element.annotationType) {
      case 'highlight':
        page.drawRectangle({
          x: element.x,
          y: pdfY,
          width: element.width,
          height: element.height,
          color: rgb(color.r, color.g, color.b),
          opacity: element.opacity,
          borderWidth: 0,
        });
        break;

      case 'underline':
        page.drawLine({
          start: { x: element.x, y: pdfY },
          end: { x: element.x + element.width, y: pdfY },
          thickness: element.strokeWidth,
          color: rgb(color.r, color.g, color.b),
          opacity: element.opacity,
        });
        break;

      case 'strikethrough':
        page.drawLine({
          start: { x: element.x, y: pdfY + element.height / 2 },
          end: { x: element.x + element.width, y: pdfY + element.height / 2 },
          thickness: element.strokeWidth,
          color: rgb(color.r, color.g, color.b),
          opacity: element.opacity,
        });
        break;

      case 'freehand':
        if (element.paths && element.paths.length > 1) {
          for (let i = 1; i < element.paths.length; i++) {
            const startPoint = element.paths[i - 1];
            const endPoint = element.paths[i];
            page.drawLine({
              start: { x: startPoint.x, y: pageHeight - startPoint.y },
              end: { x: endPoint.x, y: pageHeight - endPoint.y },
              thickness: element.strokeWidth,
              color: rgb(color.r, color.g, color.b),
              opacity: element.opacity,
            });
          }
        }
        break;

      case 'sticky-note':
        // Draw a yellow box with text
        page.drawRectangle({
          x: element.x,
          y: pdfY,
          width: element.width,
          height: element.height,
          color: rgb(color.r, color.g, color.b),
          opacity: element.opacity,
          borderWidth: 1,
          borderColor: rgb(0.8, 0.8, 0),
        });
        if (element.noteContent) {
          page.drawText(element.noteContent.substring(0, 200), {
            x: element.x + 8,
            y: pdfY + element.height - 20,
            size: 10,
            color: rgb(0, 0, 0),
            maxWidth: element.width - 16,
          });
        }
        break;
    }
  }

  /**
   * Draw a signature element on a page.
   */
  private async drawSignatureElement(
    pdfDoc: PDFDocument,
    page: PDFPage,
    element: SignatureElement,
    pageHeight: number
  ): Promise<void> {
    try {
      // Signature data is a base64 PNG or data URL
      const image = await this.imageHandler.embedImage(
        pdfDoc,
        element.signatureData,
        'png'
      );

      const imgElement: ImageElement = {
        ...element,
        type: 'image',
        src: element.signatureData,
        originalSrc: element.signatureData,
        format: 'png',
      };

      this.imageHandler.drawImage(page, image, imgElement, pageHeight);
    } catch (error) {
      console.warn('Failed to embed signature:', error);
    }
  }

  /**
   * Draw a freehand drawing element on a page.
   */
  private drawDrawingElement(
    page: PDFPage,
    element: DrawingElement,
    pageHeight: number
  ): void {
    if (!element.paths || element.paths.length < 2) return;

    const color = hexToRgb(element.strokeColor);

    for (let i = 1; i < element.paths.length; i++) {
      const start = element.paths[i - 1];
      const end = element.paths[i];

      page.drawLine({
        start: { x: start.x, y: pageHeight - start.y },
        end: { x: end.x, y: pageHeight - end.y },
        thickness: element.strokeWidth,
        color: rgb(color.r, color.g, color.b),
        opacity: element.opacity,
      });
    }
  }

  /**
   * Get or create a PDF font.
   */
  private async getFont(
    pdfDoc: PDFDocument,
    fontFamily: string,
    cache: Map<string, PDFFont>
  ): Promise<PDFFont> {
    if (cache.has(fontFamily)) {
      return cache.get(fontFamily)!;
    }

    // Map common font names to standard PDF fonts
    const fontMap: Record<string, keyof typeof StandardFonts> = {
      'Helvetica': 'Helvetica',
      'Arial': 'Helvetica',
      'Helvetica-Bold': 'HelveticaBold',
      'Arial Bold': 'HelveticaBold',
      'Times-Roman': 'TimesRoman',
      'Times New Roman': 'TimesRoman',
      'Times-Bold': 'TimesRomanBold',
      'Courier': 'Courier',
      'Courier New': 'Courier',
      'Courier-Bold': 'CourierBold',
    };

    const standardFontName = fontMap[fontFamily] || 'Helvetica';
    const font = await pdfDoc.embedFont(StandardFonts[standardFontName]);
    cache.set(fontFamily, font);
    return font;
  }
}
