/**
 * PDF Editor SDK - Image Handler
 * Manages image embedding, positioning, and manipulation in PDFs.
 */

import { PDFDocument, PDFPage, PDFImage } from 'pdf-lib';
import type { ImageElement } from '@pdfeditor/shared';
import { generateId } from '../utils/helpers';

/**
 * Handles image operations within the PDF editor.
 */
export class ImageHandler {
  /**
   * Embed an image into a PDF document.
   * Returns the embedded image reference.
   */
  async embedImage(
    pdfDoc: PDFDocument,
    imageData: Uint8Array | string,
    format: 'jpg' | 'jpeg' | 'png'
  ): Promise<PDFImage> {
    if (typeof imageData === 'string') {
      // Base64 string - extract the data part
      const base64 = imageData.includes(',') ? imageData.split(',')[1] : imageData;
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      imageData = bytes;
    }

    if (format === 'png') {
      return pdfDoc.embedPng(imageData);
    } else {
      return pdfDoc.embedJpg(imageData);
    }
  }

  /**
   * Draw an embedded image on a PDF page.
   */
  drawImage(
    page: PDFPage,
    image: PDFImage,
    element: ImageElement,
    pageHeight: number
  ): void {
    const pdfY = pageHeight - element.y - element.height;

    page.drawImage(image, {
      x: element.x,
      y: pdfY,
      width: element.width,
      height: element.height,
      opacity: element.opacity,
      rotate: element.rotation ? { type: 'degrees' as any, angle: element.rotation } as any : undefined,
    });
  }

  /**
   * Create an ImageElement from image data.
   */
  createImageElement(
    pageNumber: number,
    src: string,
    format: 'jpg' | 'jpeg' | 'png' | 'webp',
    options: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    } = {}
  ): ImageElement {
    return {
      id: generateId(),
      type: 'image',
      page: pageNumber,
      x: options.x ?? 100,
      y: options.y ?? 100,
      width: options.width ?? 200,
      height: options.height ?? 200,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      isOriginal: false,
      updatedAt: Date.now(),
      src,
      originalSrc: src,
      format,
    };
  }

  /**
   * Detect image format from bytes.
   */
  detectFormat(bytes: Uint8Array): 'jpg' | 'png' | 'webp' | 'unknown' {
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'jpg';
    }
    // PNG: 89 50 4E 47
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'png';
    }
    // WEBP: 52 49 46 46 ... 57 45 42 50
    if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      return 'webp';
    }
    return 'unknown';
  }
}
