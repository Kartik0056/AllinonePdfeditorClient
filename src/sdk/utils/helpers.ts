/**
 * PDF Editor SDK - Utility Functions
 * Coordinate transforms, ID generation, and helpers
 */

import { v4 as uuidv4 } from 'uuid';

/** Generate a unique element ID */
export function generateId(): string {
  return uuidv4();
}

/** PDF points to pixels at given DPI */
export function pointsToPixels(points: number, dpi: number = 96): number {
  return (points * dpi) / 72;
}

/** Pixels to PDF points */
export function pixelsToPoints(pixels: number, dpi: number = 96): number {
  return (pixels * 72) / dpi;
}

/**
 * Convert PDF coordinate system to screen coordinate system.
 * PDF: origin at bottom-left, y goes up
 * Screen: origin at top-left, y goes down
 */
export function pdfToScreen(
  pdfX: number,
  pdfY: number,
  pageHeight: number,
  scale: number = 1
): { x: number; y: number } {
  return {
    x: pdfX * scale,
    y: (pageHeight - pdfY) * scale,
  };
}

/**
 * Convert screen coordinates to PDF coordinate system.
 */
export function screenToPdf(
  screenX: number,
  screenY: number,
  pageHeight: number,
  scale: number = 1
): { x: number; y: number } {
  return {
    x: screenX / scale,
    y: pageHeight - screenY / scale,
  };
}

/**
 * Parse a PDF transform matrix [a, b, c, d, e, f].
 * Returns position, scale, and rotation.
 */
export function parseTransformMatrix(transform: number[]): {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
} {
  const [a, b, c, d, e, f] = transform;
  const scaleX = Math.sqrt(a * a + b * b);
  const scaleY = Math.sqrt(c * c + d * d);
  const rotation = Math.atan2(b, a) * (180 / Math.PI);

  return { x: e, y: f, scaleX, scaleY, rotation };
}

/**
 * Calculate bounding box for text given font metrics.
 */
export function calculateTextBounds(
  text: string,
  fontSize: number,
  fontWidthFactor: number = 0.6
): { width: number; height: number } {
  const width = text.length * fontSize * fontWidthFactor;
  const height = fontSize * 1.2;
  return { width, height };
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Deep clone an object.
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Convert RGB hex color to PDF color array [r, g, b] (0-1 range).
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

/**
 * Convert RGB (0-1) to hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) =>
    Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Sanitize a filename.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^[._]/, '')
    .substring(0, 255);
}

/**
 * Validate that a buffer starts with the PDF magic bytes.
 */
export function isPDFBuffer(buffer: Uint8Array): boolean {
  if (buffer.length < 5) return false;
  // %PDF-
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}
