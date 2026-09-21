/**
 * PDF Editor SDK - Annotation Manager
 * Manages annotations: highlights, underlines, shapes, drawings.
 */

import type {
  AnnotationElement,
  ShapeElement,
  DrawingElement,
  AnnotationType,
  ShapeType,
} from '@pdfeditor/shared';
import { generateId } from '../utils/helpers';
import { DEFAULT_ANNOTATION_PROPS, DEFAULT_SHAPE_PROPS } from '@pdfeditor/shared';

/**
 * Creates and manages PDF annotations.
 */
export class AnnotationManager {
  /**
   * Create a highlight annotation.
   */
  createHighlight(
    pageNumber: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string = DEFAULT_ANNOTATION_PROPS.color
  ): AnnotationElement {
    return {
      id: generateId(),
      type: 'annotation',
      annotationType: 'highlight',
      page: pageNumber,
      x,
      y,
      width,
      height,
      color,
      strokeWidth: 0,
      rotation: 0,
      opacity: 0.35,
      locked: false,
      visible: true,
      isOriginal: false,
      updatedAt: Date.now(),
    };
  }

  /**
   * Create an underline annotation.
   */
  createUnderline(
    pageNumber: number,
    x: number,
    y: number,
    width: number,
    color: string = '#F44336'
  ): AnnotationElement {
    return {
      id: generateId(),
      type: 'annotation',
      annotationType: 'underline',
      page: pageNumber,
      x,
      y,
      width,
      height: 2,
      color,
      strokeWidth: 2,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      isOriginal: false,
      updatedAt: Date.now(),
    };
  }

  /**
   * Create a strikethrough annotation.
   */
  createStrikethrough(
    pageNumber: number,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string = '#F44336'
  ): AnnotationElement {
    return {
      id: generateId(),
      type: 'annotation',
      annotationType: 'strikethrough',
      page: pageNumber,
      x,
      y: y + height / 2,
      width,
      height: 2,
      color,
      strokeWidth: 2,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      isOriginal: false,
      updatedAt: Date.now(),
    };
  }

  /**
   * Create a freehand drawing annotation.
   */
  createFreehand(
    pageNumber: number,
    paths: { x: number; y: number }[],
    color: string = '#000000',
    strokeWidth: number = 2
  ): AnnotationElement {
    if (paths.length === 0) {
      throw new Error('Freehand drawing must have at least one point');
    }

    const bounds = this.calculateBounds(paths);

    return {
      id: generateId(),
      type: 'annotation',
      annotationType: 'freehand',
      page: pageNumber,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      color,
      strokeWidth,
      paths,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      isOriginal: false,
      updatedAt: Date.now(),
    };
  }

  /**
   * Create a sticky note annotation.
   */
  createStickyNote(
    pageNumber: number,
    x: number,
    y: number,
    content: string,
    color: string = '#FFEB3B'
  ): AnnotationElement {
    return {
      id: generateId(),
      type: 'annotation',
      annotationType: 'sticky-note',
      page: pageNumber,
      x,
      y,
      width: 200,
      height: 150,
      color,
      noteContent: content,
      strokeWidth: 1,
      rotation: 0,
      opacity: 0.95,
      locked: false,
      visible: true,
      isOriginal: false,
      updatedAt: Date.now(),
    };
  }

  /**
   * Create a shape element.
   */
  createShape(
    pageNumber: number,
    shapeType: ShapeType,
    x: number,
    y: number,
    width: number,
    height: number,
    options: Partial<ShapeElement> = {}
  ): ShapeElement {
    return {
      id: generateId(),
      type: 'shape',
      shapeType,
      page: pageNumber,
      x,
      y,
      width,
      height,
      strokeColor: options.strokeColor || DEFAULT_SHAPE_PROPS.strokeColor,
      strokeWidth: options.strokeWidth || DEFAULT_SHAPE_PROPS.strokeWidth,
      fillColor: options.fillColor || DEFAULT_SHAPE_PROPS.fillColor,
      rotation: options.rotation || 0,
      opacity: options.opacity || 1,
      locked: false,
      visible: true,
      isOriginal: false,
      updatedAt: Date.now(),
      points: options.points,
    };
  }

  /**
   * Create a drawing element (pen tool).
   */
  createDrawing(
    pageNumber: number,
    paths: { x: number; y: number }[],
    strokeColor: string = '#000000',
    strokeWidth: number = 2
  ): DrawingElement {
    const bounds = this.calculateBounds(paths);

    return {
      id: generateId(),
      type: 'drawing',
      page: pageNumber,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      paths,
      strokeColor,
      strokeWidth,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      isOriginal: false,
      updatedAt: Date.now(),
    };
  }

  /**
   * Calculate bounding box of a set of points.
   */
  private calculateBounds(points: { x: number; y: number }[]): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return {
      x: minX,
      y: minY,
      width: Math.max(maxX - minX, 1),
      height: Math.max(maxY - minY, 1),
    };
  }
}
