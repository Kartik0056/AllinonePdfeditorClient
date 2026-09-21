/**
 * Landing Page - Premium hero + feature cards
 */

import React, { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Merge, Scissors, Image, Shrink, Shield,
  PenTool, Type, Stamp, Search, Upload, ArrowRight,
  Sparkles, Zap, Lock, ChevronRight, Film, Award
} from 'lucide-react';
import Navbar from '../components/Navbar';
import SpaceBackground from '../components/SpaceBackground';

const features = [
  { icon: FileText, title: 'PDF Editor', desc: 'Edit text, images, and content in any PDF', link: '/editor', color: 'from-blue-500 to-indigo-600' },
  { icon: Award, title: 'Certificate Studio', desc: 'Design luxury awards, diplomas & community templates', link: '/certificate', color: 'from-amber-500 to-yellow-600' },
  { icon: Image, title: 'Image Studio Pro', desc: 'Photoshop-grade photo editing, filters & LUTs', link: '/image-editor', color: 'from-fuchsia-500 to-purple-600' },
  { icon: Film, title: 'Video Studio Pro', desc: 'Premiere-style timeline, scissors cut & sound edit', link: '/video-editor', color: 'from-orange-500 to-rose-600' },
  { icon: Sparkles, title: 'BG Remover & PDF to JPG', desc: 'Instant transparent PNG & high-res PDF to Image', link: '/convert', color: 'from-emerald-500 to-teal-600' },
  { icon: Merge, title: 'Merge PDFs', desc: 'Visual page thumbnails, preview & combine PDFs', link: '/merge', color: 'from-purple-500 to-pink-600' },
  { icon: Scissors, title: 'Scissor Split PDF', desc: 'Interactive scissor cutters & visual page split', link: '/split', color: 'from-amber-500 to-red-600' },
  { icon: Shrink, title: 'Compress PDF', desc: 'Up to 80% reduction with smart image optimization', link: '/compress', color: 'from-cyan-500 to-blue-600' },
  { icon: Stamp, title: 'Sign & Annotate', desc: 'Digital signatures, freehand pen & highlights', link: '/editor', color: 'from-pink-500 to-rose-600' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type === 'application/pdf') {
      // Store file in sessionStorage as data URL for the editor
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
    <div className="min-h-screen bg-surface-950 overflow-y-auto relative">
      <Navbar />

      {/* Futuristic Interactive Deep-Space & Constellation Canvas */}
      <SpaceBackground />

      {/* Hero Section */}
      <section className="pt-8 sm:pt-10 pb-12 px-6 relative z-10">
        {/* Ambient cosmic nebula glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-10 left-1/4 w-80 h-80 bg-primary-500/15 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-20 right-1/4 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-xs font-medium mb-3 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            100% Free &amp; Open Source — No Paid SDKs
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-3 animate-slide-up">
            <span className="text-white">Professional </span>
            <span className="gradient-text">PDF Editor</span>
            <br />
            <span className="text-surface-300 text-2xl sm:text-3xl md:text-4xl">& Document Suite</span>
          </h1>

          <p className="text-sm sm:text-base text-surface-400 max-w-2xl mx-auto mb-5 leading-normal animate-slide-up">
            Edit, annotate, sign, merge, split, convert, and compress PDFs.
            Built with our own open-source PDF engine.
          </p>

          {/* Drop zone */}
          <div
            className={`dropzone max-w-xl mx-auto mb-5 py-6 px-6 animate-scale-in ${isDragging ? 'active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('hero-file-input')?.click()}
          >
            <input
              id="hero-file-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />
            <Upload className="w-8 h-8 text-surface-500 mx-auto mb-2" />
            <p className="text-surface-300 font-medium text-sm mb-0.5">
              Drop a PDF here or click to upload
            </p>
            <p className="text-surface-500 text-xs">Supports PDF files up to 100MB</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/editor" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base">
              <Zap className="w-4 h-4" />
              Open Editor
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/merge" className="btn-secondary inline-flex items-center gap-2 px-6 py-3 text-base">
              <Merge className="w-4 h-4" />
              Merge PDFs
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-3">Everything You Need</h2>
          <p className="text-surface-400 text-center mb-12 max-w-xl mx-auto">
            A complete suite of PDF tools built with open-source technology.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feat) => (
              <Link
                key={feat.title}
                to={feat.link}
                className="card-hover group"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feat.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-1.5">{feat.title}</h3>
                <p className="text-surface-400 text-sm leading-relaxed">{feat.desc}</p>
                <div className="mt-3 flex items-center gap-1 text-primary-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ChevronRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-800/50 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-surface-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <span>PDF Studio</span>
          </div>
          <p>Built with open-source technology. No paid PDF SDKs.</p>
        </div>
      </footer>
    </div>
  );
}
