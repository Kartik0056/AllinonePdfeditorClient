/**
 * PDF Editor SDK - History Manager
 * Command-pattern undo/redo system.
 */

import type { HistoryCommand, CommandType } from '@pdfeditor/shared';
import { generateId } from '../utils/helpers';

export interface CommandData {
  type: CommandType;
  description: string;
  execute: () => void;
  undo: () => void;
}

/**
 * Manages undo/redo history using the command pattern.
 * Each action creates a command with execute/undo functions.
 */
export class HistoryManager {
  private undoStack: CommandData[] = [];
  private redoStack: CommandData[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  /**
   * Execute a command and push it to the undo stack.
   */
  execute(command: CommandData): void {
    command.execute();
    this.undoStack.push(command);
    // Clear redo stack since we've branched
    this.redoStack = [];
    // Limit stack size
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  /**
   * Undo the last command.
   */
  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;
    command.undo();
    this.redoStack.push(command);
    return true;
  }

  /**
   * Redo the last undone command.
   */
  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;
    command.execute();
    this.undoStack.push(command);
    return true;
  }

  /**
   * Check if undo is available.
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available.
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get the description of the next undo action.
   */
  getUndoDescription(): string | null {
    const cmd = this.undoStack[this.undoStack.length - 1];
    return cmd ? cmd.description : null;
  }

  /**
   * Get the description of the next redo action.
   */
  getRedoDescription(): string | null {
    const cmd = this.redoStack[this.redoStack.length - 1];
    return cmd ? cmd.description : null;
  }

  /**
   * Get the number of items in the undo stack.
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get the number of items in the redo stack.
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Clear all history.
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
