/**
 * Upload & Processing Modal - Multi-step animated engine
 * Shows upload %, security verification, text extraction, and canvas rendering.
 */

import React from 'react';
import {
  UploadCloud,
  ShieldCheck,
  FileSearch,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
} from 'lucide-react';

export type ProcessingStep = 'uploading' | 'securing' | 'extracting' | 'rendering' | 'ready';

interface UploadProgressModalProps {
  isOpen: boolean;
  fileName: string;
  fileSizeBytes: number;
  currentStep: ProcessingStep;
  progressPercent: number;
  statusMessage: string;
  error?: string | null;
  onCancel?: () => void;
}

export default function UploadProgressModal({
  isOpen,
  fileName,
  fileSizeBytes,
  currentStep,
  progressPercent,
  statusMessage,
  error,
  onCancel,
}: UploadProgressModalProps) {
  if (!isOpen) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const steps = [
    {
      id: 'uploading',
      title: 'Uploading PDF to Secure Engine',
      subtitle: `${progressPercent}% uploaded · Encrypted TLS transfer`,
      icon: UploadCloud,
    },
    {
      id: 'securing',
      title: 'Security Scan & DRM Verification',
      subtitle: 'Sanitizing embedded scripts & validating PDF structure',
      icon: ShieldCheck,
    },
    {
      id: 'extracting',
      title: 'Extracting Text Layers & Vectors',
      subtitle: 'Parsing typography, glyph matrices & bounding boxes',
      icon: FileSearch,
    },
    {
      id: 'rendering',
      title: 'Generating Ultra-HD Canvas & Thumbnails',
      subtitle: 'Rasterizing multi-resolution vector viewports',
      icon: Layers,
    },
    {
      id: 'ready',
      title: 'Studio Workspace Ready',
      subtitle: 'Initializing high-precision editing environment',
      icon: Sparkles,
    },
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['uploading', 'securing', 'extracting', 'rendering', 'ready'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const thisIndex = stepOrder.indexOf(stepId);

    if (error) {
      if (thisIndex === currentIndex) return 'error';
      if (thisIndex < currentIndex) return 'completed';
      return 'pending';
    }

    if (thisIndex < currentIndex) return 'completed';
    if (thisIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface-900 border border-surface-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-surface-100">
        {/* Top Header Background Glow */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary-600/20 via-primary-500/5 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="relative p-6 pb-4 border-b border-surface-800/80 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-400 shadow-inner">
              <FileText className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">Processing PDF Document</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/30">
                  Max 20MB
                </span>
              </div>
              <p className="text-xs text-surface-400 mt-0.5 truncate max-w-xs" title={fileName}>
                {fileName} ({formatSize(fileSizeBytes)})
              </p>
            </div>
          </div>

          {onCancel && !error && (
            <button
              onClick={onCancel}
              className="text-surface-400 hover:text-white p-1 rounded-lg hover:bg-surface-800 transition-colors"
              title="Cancel processing"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error Notification */}
        {error ? (
          <div className="p-6">
            <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-400">Processing Failed</h4>
                <p className="text-xs text-red-200 mt-1 leading-relaxed">{error}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close & Try Again
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Live Progress Bar & Percentage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-surface-300 flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary-500 animate-ping" />
                  {statusMessage || 'Analyzing document...'}
                </span>
                <span className="font-mono font-bold text-primary-400 text-sm">{progressPercent}%</span>
              </div>

              <div className="w-full h-2.5 bg-surface-800 rounded-full overflow-hidden p-0.5 border border-surface-700/60">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 via-indigo-500 to-cyan-400 rounded-full transition-all duration-300 shadow-md shadow-primary-500/50"
                  style={{ width: `${Math.max(5, progressPercent)}%` }}
                />
              </div>
            </div>

            {/* Step-by-Step Pipeline */}
            <div className="space-y-3 pt-1">
              {steps.map((step) => {
                const status = getStepStatus(step.id);
                const IconComponent = step.icon;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 border ${
                      status === 'active'
                        ? 'bg-primary-500/10 border-primary-500/30 text-white shadow-sm'
                        : status === 'completed'
                        ? 'bg-surface-800/40 border-surface-800 text-surface-300'
                        : 'bg-transparent border-transparent opacity-40 text-surface-500'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        status === 'active'
                          ? 'bg-primary-500 text-white shadow-md shadow-primary-500/30 animate-pulse'
                          : status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-surface-800 text-surface-600'
                      }`}
                    >
                      {status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <IconComponent className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate flex items-center gap-2">
                        <span>{step.title}</span>
                        {status === 'active' && (
                          <span className="text-[10px] text-primary-300 font-normal animate-pulse font-mono">
                            In progress...
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-surface-400 truncate">{step.subtitle}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Security Note */}
            <div className="pt-2 text-center">
              <p className="text-[11px] text-surface-500">
                🔒 Protected with client-side zero-leak parsing & 10-minute auto-expiry retention.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
