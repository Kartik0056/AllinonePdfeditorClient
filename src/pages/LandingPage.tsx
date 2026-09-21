/**
 * Landing Page - Handcrafted, Human-Engineered PDF Studio
 * Designed with clean typography, real interactive product previews, and zero AI fluff.
 */

import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Merge, Scissors, Image, Shrink, Shield,
  PenTool, Type, Stamp, Search, Upload, ArrowRight,
  Sparkles, Zap, Lock, ChevronRight, Film, Award,
  Camera, Check, CheckCircle2, Copy, MoveRight, HelpCircle
} from 'lucide-react';
import Navbar from '../components/Navbar';

const features = [
  {
    icon: FileText,
    title: 'Direct PDF Editor',
    badge: 'Word-Style',
    desc: 'Click on any text in your document to edit it right in place. No sidebars or popups.',
    link: '/editor',
    shortcut: 'Double-click text',
  },
  {
    icon: Award,
    title: 'Certificate Studio',
    badge: 'New Studio',
    desc: 'Create academic diplomas & corporate awards from scratch with authentic Guilloche borders.',
    link: '/certificate',
    shortcut: 'Borders & Wax Seals',
  },
  {
    icon: Camera,
    title: 'Passport Photo Studio',
    badge: 'Print Ready',
    desc: 'Crop to exact 35x45mm or 2x2" and generate multi-photo sheets on standard 4x6" & A4 paper.',
    link: '/passport-photo',
    shortcut: 'A4 Multi-Grid',
  },
  {
    icon: Merge,
    title: 'Merge PDFs',
    badge: 'Drag & Drop',
    desc: 'Combine multiple PDFs into a single document with visual thumbnail page ordering.',
    link: '/merge',
    shortcut: 'Reorder pages',
  },
  {
    icon: Scissors,
    title: 'Split & Extract',
    badge: 'Instant',
    desc: 'Extract specific pages or split large PDFs into separate files with visual scissor cuts.',
    link: '/split',
    shortcut: 'Page range selection',
  },
  {
    icon: Sparkles,
    title: 'Convert & OCR',
    badge: 'High-Res',
    desc: 'Convert PDF pages to 300 DPI images or transparent PNGs with smart background removal.',
    link: '/convert',
    shortcut: 'PNG / JPG export',
  },
  {
    icon: Shrink,
    title: 'Compress PDF',
    badge: 'Lossless',
    desc: 'Reduce file size up to 80% without losing readable text sharpness or image clarity.',
    link: '/compress',
    shortcut: 'Smart downsampling',
  },
  {
    icon: Image,
    title: 'Image Studio',
    badge: 'Pro Editor',
    desc: 'Crop, adjust exposure, balance color curves, and apply professional studio LUT filters.',
    link: '/image-editor',
    shortcut: 'Full raster tools',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);

  // Interactive Live Demo State
  const [demoText, setDemoText] = useState('Alexander Montgomery');
  const [isDemoEditing, setIsDemoEditing] = useState(false);
  const [demoFontSize, setDemoFontSize] = useState(16);
  const [demoIsBold, setDemoIsBold] = useState(true);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = () => {
        sessionStorage.setItem('pendingPDF', reader.result as string);
        sessionStorage.setItem('pendingPDFName', file.name);
        navigate('/editor');
      };
      reader.readAsDataURL(file);
    }
  }, [navigate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col font-sans selection:bg-primary-500/30">
      <Navbar />

      {/* Subtle Studio Grid Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-900/50 via-surface-950 to-surface-950">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Hero Section */}
      <section className="pt-12 sm:pt-16 pb-16 px-4 sm:px-6 max-w-6xl mx-auto w-full text-center">
        {/* Human Pill Tag */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-900 border border-surface-700/80 text-surface-300 text-xs font-medium mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>No Signups Required · 100% Private in Your Browser · Free Forever</span>
        </div>

        {/* Main Human-Crafted Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] mb-5 max-w-4xl mx-auto">
          Direct In-Place PDF Editing. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-white via-surface-200 to-surface-400 bg-clip-text text-transparent">
            Just Like Microsoft Word.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-surface-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          Click on any word to edit text directly on the page. No bulky sidebars, no modal popups, and zero cloud uploads. Your documents stay 100% private on your device.
        </p>

        {/* Dropzone & Primary Action */}
        <div className="max-w-2xl mx-auto mb-12">
          <div
            className={`p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer bg-surface-900/40 backdrop-blur-md ${
              isDragging
                ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
                : 'border-surface-700/80 hover:border-primary-500/60 hover:bg-surface-900/70'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('landing-file-input')?.click()}
          >
            <input
              id="landing-file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            <div className="w-12 h-12 rounded-2xl bg-surface-800/80 border border-surface-700 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Upload className="w-5 h-5 text-primary-400" />
            </div>

            <h3 className="text-sm font-bold text-white mb-1">
              Drop a PDF here or <span className="text-primary-400 hover:underline">browse files</span>
            </h3>
            <p className="text-xs text-surface-400">
              Files are processed entirely in your browser using local WebAssembly. Zero data uploaded.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <Link
              to="/editor"
              className="btn-primary text-xs sm:text-sm px-5 py-2.5 flex items-center gap-2 font-bold shadow-lg shadow-primary-500/20"
            >
              <FileText className="w-4 h-4" />
              <span>Open Blank PDF Editor</span>
            </Link>

            <Link
              to="/certificate"
              className="btn-secondary text-xs sm:text-sm px-4 py-2.5 flex items-center gap-2 font-semibold"
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Certificate Studio</span>
            </Link>

            <Link
              to="/passport-photo"
              className="btn-secondary text-xs sm:text-sm px-4 py-2.5 flex items-center gap-2 font-semibold"
            >
              <Camera className="w-4 h-4 text-cyan-400" />
              <span>Passport Photo Maker</span>
            </Link>
          </div>
        </div>

        {/* ─── INTERACTIVE LIVE IN-PLACE EDITING SHOWCASE ─────────────── */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-surface-800 bg-surface-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-left">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-surface-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs font-mono text-surface-400 ml-2">Interactive In-Place Editing Preview</span>
            </div>
            <span className="text-[11px] font-semibold text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/20">
              Try clicking the recipient name below
            </span>
          </div>

          {/* Simulated Document Preview */}
          <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl shadow-md border border-slate-200">
            <div className="text-[11px] uppercase tracking-widest text-slate-500 font-mono mb-2">
              ACME CORP · OFFICIAL SERVICE AGREEMENT
            </div>

            <div className="text-xs text-slate-600 mb-4 leading-relaxed">
              This document certifies that the following recipient has been appointed as Principal Technology Consultant:
            </div>

            {/* Interactive in-place edit target */}
            <div className="relative inline-block my-2">
              {isDemoEditing && (
                <div className="absolute -top-10 left-0 flex items-center gap-1.5 bg-surface-900 text-white rounded-lg px-2 py-1 shadow-2xl border border-surface-700 text-xs whitespace-nowrap z-30 animate-in fade-in slide-in-from-bottom-1">
                  <button
                    onClick={() => setDemoFontSize((s) => Math.max(12, s - 2))}
                    className="text-[10px] px-1 text-surface-400 hover:text-white font-bold"
                  >
                    A-
                  </button>
                  <span className="text-[10px] font-mono text-primary-300 font-bold px-1">{demoFontSize}pt</span>
                  <button
                    onClick={() => setDemoFontSize((s) => Math.min(24, s + 2))}
                    className="text-[10px] px-1 text-surface-400 hover:text-white font-bold"
                  >
                    A+
                  </button>
                  <div className="w-px h-3 bg-surface-700 mx-0.5" />
                  <button
                    onClick={() => setDemoIsBold(!demoIsBold)}
                    className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${demoIsBold ? 'bg-primary-500 text-white' : 'text-surface-300'}`}
                  >
                    B
                  </button>
                  <button
                    onClick={() => setIsDemoEditing(false)}
                    className="ml-1 px-2 py-0.5 bg-primary-500 text-white text-[10px] font-bold rounded flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" /> Done
                  </button>
                </div>
              )}

              {isDemoEditing ? (
                <input
                  type="text"
                  value={demoText}
                  onChange={(e) => setDemoText(e.target.value)}
                  onBlur={() => setIsDemoEditing(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setIsDemoEditing(false); }}
                  autoFocus
                  className="border border-blue-500 ring-2 ring-blue-400/40 rounded px-1.5 py-0.5 outline-none bg-white text-slate-900"
                  style={{
                    fontSize: `${demoFontSize}px`,
                    fontWeight: demoIsBold ? 'bold' : 'normal',
                  }}
                />
              ) : (
                <div
                  onClick={() => setIsDemoEditing(true)}
                  className="cursor-pointer border border-dashed border-blue-400 bg-blue-50/70 hover:bg-blue-100/70 px-2 py-0.5 rounded transition-all flex items-center gap-2 group"
                  title="Click to edit directly like Word"
                >
                  <span
                    className="text-slate-900"
                    style={{
                      fontSize: `${demoFontSize}px`,
                      fontWeight: demoIsBold ? 'bold' : 'normal',
                    }}
                  >
                    {demoText}
                  </span>
                  <span className="text-[10px] text-blue-600 font-mono opacity-60 group-hover:opacity-100">
                    ✎ click to edit
                  </span>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-200/80 flex items-center justify-between">
              <span>Authorized Signature: <span className="font-serif italic text-slate-700">Dr. Margaret Sterling</span></span>
              <span className="font-mono text-[11px]">VERIFIED · NO POPUPS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3 HUMAN PILLARS ────────────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto w-full border-t border-surface-800/80">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-surface-900/50 border border-surface-800">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Type className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Direct In-Place Editing</h3>
            <p className="text-xs text-surface-400 leading-relaxed">
              Never search through awkward side inspector panels or modal dialogs. Click on text and type right on the page, exactly as you expect from modern word processors.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-900/50 border border-surface-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">100% Client-Side Privacy</h3>
            <p className="text-xs text-surface-400 leading-relaxed">
              Your confidential contracts, tax returns, and bank statements are processed entirely in your local browser sandbox using WebAssembly. No files are uploaded to any server.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-surface-900/50 border border-surface-800">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">Creative Studio Suite</h3>
            <p className="text-xs text-surface-400 leading-relaxed">
              Beyond simple PDF editing, design custom certificates with authentic Guilloche borders and wax seals, or prepare government-spec passport photo sheets for print.
            </p>
          </div>
        </div>
      </section>

      {/* ─── ALL TOOLS GRID ─────────────────────────────────────────── */}
      <section className="py-16 px-4 sm:px-6 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Complete Creative & Document Utilities</h2>
          <p className="text-xs sm:text-sm text-surface-400 max-w-lg mx-auto">
            Everything you need for everyday paperwork, design, and file conversion in one clean place.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <Link
                key={feat.title}
                to={feat.link}
                className="group p-5 rounded-2xl bg-surface-900/60 border border-surface-800 hover:border-surface-700 transition-all hover:-translate-y-0.5 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center group-hover:bg-primary-500/20 transition-colors">
                      <Icon className="w-5 h-5 text-primary-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-surface-400 bg-surface-800/80 px-2 py-0.5 rounded-full border border-surface-700/60">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1 group-hover:text-primary-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs text-surface-400 leading-relaxed mb-4">
                    {feat.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-surface-800/80 flex items-center justify-between text-[11px] text-surface-500 font-medium">
                  <span>{feat.shortcut}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-surface-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── HUMAN FAQ SECTION ──────────────────────────────────────── */}
      <section className="py-12 px-4 sm:px-6 max-w-4xl mx-auto w-full border-t border-surface-800">
        <h2 className="text-xl font-bold text-white text-center mb-8 flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary-400" />
          <span>Frequently Asked Questions</span>
        </h2>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface-900/50 border border-surface-800">
            <h4 className="text-xs font-bold text-white mb-1">
              How does in-place text editing work?
            </h4>
            <p className="text-xs text-surface-400 leading-relaxed">
              When you open a PDF and click on any text, an in-place editable field appears directly over the word with matching font size, family, and color. You type directly on the page, and your changes commit automatically as you click away. No sidebars required.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-900/50 border border-surface-800">
            <h4 className="text-xs font-bold text-white mb-1">
              Are my files uploaded to your servers?
            </h4>
            <p className="text-xs text-surface-400 leading-relaxed">
              No. All PDF viewing, text replacement, page merging, and conversions run locally inside your browser using client-side JavaScript and WebAssembly. Your files never leave your device.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-900/50 border border-surface-800">
            <h4 className="text-xs font-bold text-white mb-1">
              Can I design certificates from scratch or only edit templates?
            </h4>
            <p className="text-xs text-surface-400 leading-relaxed">
              You can do both! Certificate Studio features a "New From Scratch" mode with authentic Guilloche borders, 24K gold seals, wax stamps, dual signatures, and custom logo uploads. You can also publish your designs to the community as free or paid templates.
            </p>
          </div>
        </div>
      </section>

      {/* ─── HUMAN FOOTER ──────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-surface-800 py-8 px-6 bg-surface-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-surface-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
              P
            </div>
            <span className="font-bold text-white">PDF Studio</span>
            <span className="text-surface-600">·</span>
            <span>Handcrafted for fast, private document workflows.</span>
          </div>

          <div className="flex items-center gap-4 text-surface-400">
            <Link to="/editor" className="hover:text-white transition-colors">PDF Editor</Link>
            <Link to="/certificate" className="hover:text-white transition-colors">Certificate Studio</Link>
            <Link to="/passport-photo" className="hover:text-white transition-colors">Passport Photo</Link>
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
