/**
 * Save & Exit Confirmation Modal
 * Allows saving edited PDF to dashboard with 10-minute TTL or discarding changes.
 */

import React from 'react';
import { Clock, ShieldAlert, Check, X, FileText, Loader2, ArrowLeft } from 'lucide-react';

interface SaveExitModalProps {
  isOpen: boolean;
  fileName: string;
  isSaving: boolean;
  onSaveAndExit: () => void;
  onDiscardAndExit: () => void;
  onCancel: () => void;
}

export default function SaveExitModal({
  isOpen,
  fileName,
  isSaving,
  onSaveAndExit,
  onDiscardAndExit,
  onCancel,
}: SaveExitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl overflow-hidden text-surface-100 p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-400 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white tracking-tight">Save Edited Document?</h3>
            <p className="text-xs text-surface-400 mt-1 truncate" title={fileName}>
              {fileName || 'document.pdf'}
            </p>
          </div>
        </div>

        {/* 10-Minute TTL Notice Card */}
        <div className="p-3.5 rounded-xl bg-surface-800/80 border border-surface-700 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Clock className="w-4 h-4" />
            <span>10-Minute Cloud Retention Policy</span>
          </div>
          <p className="text-[11px] text-surface-300 leading-relaxed">
            Your edited PDF will be saved to your Recent Projects dashboard with an automatic <strong>10-minute countdown</strong>.
            After 10 minutes, both database entries and stored files are automatically purged for total privacy.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={onSaveAndExit}
            className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting & Saving (10m TTL)...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save to Dashboard & Exit (10m Auto-Delete)</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={onDiscardAndExit}
              className="btn-ghost text-xs py-2 text-red-400 hover:bg-red-500/10 border border-surface-800 hover:border-red-500/30 flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Discard & Exit</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={onCancel}
              className="btn-secondary text-xs py-2 flex items-center justify-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Keep Editing</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
