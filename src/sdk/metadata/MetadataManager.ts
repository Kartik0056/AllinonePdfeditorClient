/**
 * PDF Editor SDK - Metadata Manager
 * Read and write PDF metadata fields.
 */

import { PDFDocument } from 'pdf-lib';
import type { PDFMetadata } from '@pdfeditor/shared';

/**
 * Manages PDF document metadata.
 */
export class MetadataManager {
  /**
   * Read all metadata from a PDF document.
   */
  readMetadata(pdfDoc: PDFDocument): PDFMetadata {
    const metadata: PDFMetadata = {};

    try {
      metadata.title = pdfDoc.getTitle() || undefined;
      metadata.author = pdfDoc.getAuthor() || undefined;
      metadata.subject = pdfDoc.getSubject() || undefined;
      metadata.keywords = pdfDoc.getKeywords() || undefined;
      metadata.creator = pdfDoc.getCreator() || undefined;
      metadata.producer = pdfDoc.getProducer() || undefined;

      const creationDate = pdfDoc.getCreationDate();
      if (creationDate) metadata.creationDate = creationDate.toISOString();

      const modDate = pdfDoc.getModificationDate();
      if (modDate) metadata.modificationDate = modDate.toISOString();
    } catch {
      // Some fields may not be available
    }

    return metadata;
  }

  /**
   * Write metadata to a PDF document.
   */
  writeMetadata(pdfDoc: PDFDocument, metadata: Partial<PDFMetadata>): void {
    if (metadata.title !== undefined) pdfDoc.setTitle(metadata.title || '');
    if (metadata.author !== undefined) pdfDoc.setAuthor(metadata.author || '');
    if (metadata.subject !== undefined) pdfDoc.setSubject(metadata.subject || '');
    if (metadata.keywords !== undefined) pdfDoc.setKeywords(metadata.keywords ? [metadata.keywords] : []);
    if (metadata.creator !== undefined) pdfDoc.setCreator(metadata.creator || '');
    if (metadata.producer !== undefined) pdfDoc.setProducer(metadata.producer || '');

    // Always update modification date
    pdfDoc.setModificationDate(new Date());
  }

  /**
   * Read metadata from PDF bytes.
   */
  async readFromBytes(pdfBytes: Uint8Array | ArrayBuffer): Promise<PDFMetadata> {
    const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    return this.readMetadata(pdfDoc);
  }

  /**
   * Write metadata to PDF bytes and return new bytes.
   */
  async writeToBytes(
    pdfBytes: Uint8Array | ArrayBuffer,
    metadata: Partial<PDFMetadata>
  ): Promise<Uint8Array> {
    const bytes = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);
    const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    this.writeMetadata(pdfDoc, metadata);
    return pdfDoc.save();
  }
}
