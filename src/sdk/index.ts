/**
 * @pdfeditor/sdk - Public API
 */

// Core
export { PDFEditor } from './core/PDFEditor';
export { PDFDocumentModel } from './core/DocumentModel';

// Parser
export { PDFParser } from './parser/PDFParser';
export { ContentStreamParser } from './parser/ContentStreamParser';

// Text
export { TextExtractor } from './text/TextExtractor';

// Images
export { ImageHandler } from './images/ImageHandler';

// Pages
export { PageManager } from './pages/PageManager';

// Annotations
export { AnnotationManager } from './annotations/AnnotationManager';

// Merge & Split
export { PDFMerger } from './merge/PDFMerger';
export { PDFSplitter } from './split/PDFSplitter';

// Export
export { PDFExporter } from './export/PDFExporter';

// Metadata
export { MetadataManager } from './metadata/MetadataManager';

// History
export { HistoryManager } from './history/HistoryManager';

// Utils
export * from './utils/helpers';

// Re-export types
export type {
  PDFJSTextContent,
  PDFJSTextItem,
} from './text/TextExtractor';
