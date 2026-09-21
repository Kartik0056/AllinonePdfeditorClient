/**
 * PDF Editor SDK - PDF Parser
 * Loads PDFs using pdf-lib and extracts structural information.
 */

import { PDFDocument, PDFPage, PDFName, PDFDict, PDFArray, PDFString, PDFHexString } from 'pdf-lib';
import type { PageInfo, PDFMetadata } from '@pdfeditor/shared';
import { isPDFBuffer } from '../utils/helpers';

export interface ParsedPDF {
  document: PDFDocument;
  pages: ParsedPage[];
  metadata: PDFMetadata;
  totalPages: number;
  originalBytes: Uint8Array;
}

export interface ParsedPage {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  pdfPage: PDFPage;
}

/**
 * Parses a PDF file and extracts structural information.
 */
export class PDFParser {
  /**
   * Load and parse a PDF from bytes.
   */
  async parse(data: Uint8Array | ArrayBuffer, password?: string): Promise<ParsedPDF> {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

    if (!isPDFBuffer(bytes)) {
      throw new Error('Invalid PDF file: does not start with %PDF- header');
    }

    try {
      const loadOptions: { password?: string; ignoreEncryption?: boolean } = {};
      if (password) {
        loadOptions.password = password;
      }

      const pdfDoc = await PDFDocument.load(bytes, {
        ignoreEncryption: !password,
        ...loadOptions,
      });

      const pages = this.extractPages(pdfDoc);
      const metadata = this.extractMetadata(pdfDoc);

      return {
        document: pdfDoc,
        pages,
        metadata,
        totalPages: pdfDoc.getPageCount(),
        originalBytes: bytes,
      };
    } catch (error: any) {
      if (error.message?.includes('encrypted') || error.message?.includes('password')) {
        throw new Error('PDF is password-protected. Please provide the correct password.');
      }
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  /**
   * Extract page information from the PDF document.
   */
  private extractPages(pdfDoc: PDFDocument): ParsedPage[] {
    const pages: ParsedPage[] = [];
    const pdfPages = pdfDoc.getPages();

    for (let i = 0; i < pdfPages.length; i++) {
      const page = pdfPages[i];
      const { width, height } = page.getSize();
      const rotation = page.getRotation().angle;

      pages.push({
        pageNumber: i + 1,
        width,
        height,
        rotation,
        pdfPage: page,
      });
    }

    return pages;
  }

  /**
   * Extract metadata from the PDF document.
   */
  private extractMetadata(pdfDoc: PDFDocument): PDFMetadata {
    const metadata: PDFMetadata = {};

    try {
      metadata.title = pdfDoc.getTitle() || undefined;
      metadata.author = pdfDoc.getAuthor() || undefined;
      metadata.subject = pdfDoc.getSubject() || undefined;
      metadata.creator = pdfDoc.getCreator() || undefined;
      metadata.producer = pdfDoc.getProducer() || undefined;
      metadata.keywords = pdfDoc.getKeywords() || undefined;
      metadata.creationDate = pdfDoc.getCreationDate()?.toISOString() || undefined;
      metadata.modificationDate = pdfDoc.getModificationDate()?.toISOString() || undefined;
    } catch {
      // Some metadata fields may not be available
    }

    return metadata;
  }

  /**
   * Create a new blank PDF document.
   */
  async createBlank(width: number = 595.28, height: number = 841.89): Promise<ParsedPDF> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([width, height]);
    const bytes = await pdfDoc.save();

    return {
      document: pdfDoc,
      pages: [{
        pageNumber: 1,
        width,
        height,
        rotation: 0,
        pdfPage: page,
      }],
      metadata: {},
      totalPages: 1,
      originalBytes: new Uint8Array(bytes),
    };
  }
}
