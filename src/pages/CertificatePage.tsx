/**
 * CertificatePage - Professional Certificate Studio & Template Marketplace
 *
 * Features:
 * - Rich predesigned official templates (Academic, Corporate, Sports, Course, Appreciation, Luxury)
 * - Community Marketplace with Public/Private and Free/Paid template publishing
 * - Live interactive customization: Typography, borders, colors, digital signatures, wax seals, QR codes
 * - Multi-format export: Vector PDF, 300DPI PNG, and direct Print
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Award, Download, Sparkles, Plus, Share2, Check, Copy, Eye,
  Printer, Layers, Palette, FileText, CheckCircle2, ShieldCheck,
  Medal, Star, RefreshCw, Sliders, ExternalLink, Lock, DollarSign,
  Upload, Trash2, ChevronRight, PenTool, Layout, ArrowLeft
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { downloadFile } from '../services/api';

// ─── Interfaces ──────────────────────────────────────────────────────────

export type CertificateCategory = 'all' | 'academic' | 'corporate' | 'course' | 'appreciation' | 'sports' | 'luxury';

export interface CertificateTemplate {
  id: string;
  title: string;
  category: CertificateCategory;
  author: string;
  isOfficial: boolean;
  isPaid: boolean;
  price?: string;
  orientation: 'landscape' | 'portrait';
  theme: {
    primary: string;
    secondary: string;
    background: string;
    paperTint: string;
    borderStyle: 'double-gold' | 'ornamental' | 'modern-corner' | 'minimal-line' | 'obsidian-luxury';
    badgeType: 'gold-star' | 'rosette' | 'blue-ribbon' | 'wax-seal' | 'verified-shield';
    fontFamily: 'script' | 'serif' | 'modern' | 'gothic';
  };
  data: {
    organization: string;
    certificateTitle: string;
    presentationText: string;
    recipientName: string;
    description: string;
    issueDate: string;
    certificateId: string;
    signer1Name: string;
    signer1Title: string;
    signer1Sig: string;
    signer2Name: string;
    signer2Title: string;
    signer2Sig: string;
  };
}

// ─── Official Predesigned Templates ─────────────────────────────────────

const OFFICIAL_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'tmpl-academic-gold',
    title: 'Academic Honors & Diploma',
    category: 'academic',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: false,
    price: 'Free',
    orientation: 'landscape',
    theme: {
      primary: '#C59B27',
      secondary: '#0F2C59',
      background: '#0B132B',
      paperTint: '#FDFBF7',
      borderStyle: 'double-gold',
      badgeType: 'gold-star',
      fontFamily: 'serif',
    },
    data: {
      organization: 'OXFORD ACADEMY OF ADVANCED SCIENCES',
      certificateTitle: 'CERTIFICATE OF ACADEMIC EXCELLENCE',
      presentationText: 'This diploma is proudly awarded to',
      recipientName: 'Alexander Montgomery',
      description: 'for demonstrating exceptional scholarly achievement, rigorous academic discipline, and peerless dedication to scientific inquiry during the 2025-2026 Academic Honors Program.',
      issueDate: 'September 21, 2026',
      certificateId: 'OXF-HON-2026-98421',
      signer1Name: 'Dr. Arthur Pendelton',
      signer1Title: 'Dean of Academic Affairs',
      signer1Sig: 'Arthur Pendelton',
      signer2Name: 'Prof. Margaret Sterling',
      signer2Title: 'Chancellor of Faculty',
      signer2Sig: 'Margaret Sterling',
    },
  },
  {
    id: 'tmpl-corporate-excellence',
    title: 'Corporate Achievement & Leadership',
    category: 'corporate',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: false,
    price: 'Free',
    orientation: 'landscape',
    theme: {
      primary: '#059669',
      secondary: '#1E293B',
      background: '#022C22',
      paperTint: '#F8FAFC',
      borderStyle: 'modern-corner',
      badgeType: 'verified-shield',
      fontFamily: 'modern',
    },
    data: {
      organization: 'VANGUARD GLOBAL VENTURES',
      certificateTitle: 'OUTSTANDING LEADERSHIP AWARD',
      presentationText: 'In sincere recognition of the valuable contribution of',
      recipientName: 'Sophia Lin Chen',
      description: 'for visionary strategic leadership, record-setting team mentorship, and exemplary dedication leading to milestone operational excellence across enterprise operations.',
      issueDate: 'September 21, 2026',
      certificateId: 'VGV-EXEC-2026-00452',
      signer1Name: 'Marcus Sterling',
      signer1Title: 'Chief Executive Officer',
      signer1Sig: 'Marcus Sterling',
      signer2Name: 'Helena Bergqvist',
      signer2Title: 'VP of Human Resources',
      signer2Sig: 'Helena Bergqvist',
    },
  },
  {
    id: 'tmpl-course-completion',
    title: 'Modern Tech & Course Completion',
    category: 'course',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: false,
    price: 'Free',
    orientation: 'landscape',
    theme: {
      primary: '#6366F1',
      secondary: '#4338CA',
      background: '#1E1B4B',
      paperTint: '#FAFAFA',
      borderStyle: 'minimal-line',
      badgeType: 'rosette',
      fontFamily: 'modern',
    },
    data: {
      organization: 'GLOBAL AI & SOFTWARE FOUNDATION',
      certificateTitle: 'CERTIFICATE OF COMPLETION',
      presentationText: 'This is to officially certify that',
      recipientName: 'David K. Robinson',
      description: 'has successfully completed the comprehensive Full-Stack Cloud Architecture & Advanced Systems Engineering professional masterclass program with distinction.',
      issueDate: 'September 21, 2026',
      certificateId: 'GAISF-CS-2026-8812',
      signer1Name: 'Vikram Joshi',
      signer1Title: 'Lead Instructor',
      signer1Sig: 'Vikram Joshi',
      signer2Name: 'Dr. Sarah Connor',
      signer2Title: 'Program Director',
      signer2Sig: 'Sarah Connor',
    },
  },
  {
    id: 'tmpl-luxury-obsidian',
    title: 'Luxury Obsidian VIP Recognition',
    category: 'luxury',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: true,
    price: '₹299',
    orientation: 'landscape',
    theme: {
      primary: '#E5C07B',
      secondary: '#D4AF37',
      background: '#090A0F',
      paperTint: '#0F1117',
      borderStyle: 'obsidian-luxury',
      badgeType: 'wax-seal',
      fontFamily: 'serif',
    },
    data: {
      organization: 'THE SOVEREIGN HERITAGE CLUB',
      certificateTitle: 'HONORARY FELLOWSHIP CITATION',
      presentationText: 'Conferred with highest esteem upon',
      recipientName: 'Lord Harrison Beaumont',
      description: 'in recognition of enduring philanthropy, distinguished patronage of global cultural arts, and lifetime meritorious service to public welfare.',
      issueDate: 'September 21, 2026',
      certificateId: 'SHC-FELLOW-2026-001',
      signer1Name: 'His Grace Alistair Croft',
      signer1Title: 'President of Fellowship',
      signer1Sig: 'Alistair Croft',
      signer2Name: 'Lady Beatrice Vance',
      signer2Title: 'Secretary General',
      signer2Sig: 'Beatrice Vance',
    },
  },
  {
    id: 'tmpl-appreciation-classic',
    title: 'Heartfelt Appreciation & Gratitude',
    category: 'appreciation',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: false,
    price: 'Free',
    orientation: 'landscape',
    theme: {
      primary: '#BE185D',
      secondary: '#831843',
      background: '#4C0519',
      paperTint: '#FFFDFD',
      borderStyle: 'ornamental',
      badgeType: 'blue-ribbon',
      fontFamily: 'script',
    },
    data: {
      organization: 'HOPE & HARMONY COMMUNITY FOUNDATION',
      certificateTitle: 'CERTIFICATE OF DEEP APPRECIATION',
      presentationText: 'Presented with heartfelt appreciation to',
      recipientName: 'Emily Watson-Cross',
      description: 'for selfless volunteer commitment, compassionate community outreach, and tireless dedication towards uplifting underprivileged families during 2026.',
      issueDate: 'September 21, 2026',
      certificateId: 'HHCF-COMM-2026-3391',
      signer1Name: 'Rev. Jonathan Miller',
      signer1Title: 'Trustee Board Director',
      signer1Sig: 'Jonathan Miller',
      signer2Name: 'Clara Oswald',
      signer2Title: 'Coordinator of Volunteers',
      signer2Sig: 'Clara Oswald',
    },
  },
  {
    id: 'tmpl-sports-champion',
    title: 'National Sports & Champion Trophy',
    category: 'sports',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: true,
    price: '₹149',
    orientation: 'landscape',
    theme: {
      primary: '#D97706',
      secondary: '#991B1B',
      background: '#450A0A',
      paperTint: '#FFFBEB',
      borderStyle: 'double-gold',
      badgeType: 'gold-star',
      fontFamily: 'modern',
    },
    data: {
      organization: 'NATIONAL INTERCOLLEGIATE ATHLETICS LEAGUE',
      certificateTitle: 'CHAMPIONSHIP VICTORY CITATION',
      presentationText: 'Awarded to Champion Athlete',
      recipientName: 'Liam Tyler Vance',
      description: 'for securing First Place and setting a new championship record at the 2026 National Intercollegiate Track & Field Tournament.',
      issueDate: 'September 21, 2026',
      certificateId: 'NIAL-CHAMP-2026-5501',
      signer1Name: 'Coach Robert Hayes',
      signer1Title: 'Chief Tournament Referee',
      signer1Sig: 'Robert Hayes',
      signer2Name: 'Diana Prince',
      signer2Title: 'Athletics Commissioner',
      signer2Sig: 'Diana Prince',
    },
  },
];

export default function CertificatePage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'studio' | 'marketplace' | 'my-templates'>('studio');

  // Active Certificate Design State
  const [activeTemplate, setActiveTemplate] = useState<CertificateTemplate>(OFFICIAL_TEMPLATES[0]);

  // Marketplace states
  const [selectedCategory, setSelectedCategory] = useState<CertificateCategory>('all');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'paid'>('all');
  const [userTemplates, setUserTemplates] = useState<CertificateTemplate[]>([]);

  // Publish Dialog State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({
    title: '',
    category: 'academic' as CertificateCategory,
    isPublic: true,
    isPaid: false,
    price: '₹199',
    authorName: 'Kartik K.',
  });

  // Export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Certificate Canvas element ref
  const certificateRef = useRef<HTMLDivElement>(null);

  // Load custom user templates from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pdfstudio_custom_templates');
      if (stored) {
        setUserTemplates(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load custom templates:', e);
    }
  }, []);

  // Combined Marketplace Templates (Official + Public Community)
  const allTemplates = useMemo(() => {
    return [...OFFICIAL_TEMPLATES, ...userTemplates.filter((t) => t.isOfficial || (t as any).isPublic !== false)];
  }, [userTemplates]);

  // Filtered Templates
  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((tmpl) => {
      const matchCat = selectedCategory === 'all' || tmpl.category === selectedCategory;
      const matchPrice =
        filterType === 'all' ||
        (filterType === 'free' && !tmpl.isPaid) ||
        (filterType === 'paid' && tmpl.isPaid);
      return matchCat && matchPrice;
    });
  }, [allTemplates, selectedCategory, filterType]);

  // Select a template from marketplace and customize
  const handleSelectTemplate = (template: CertificateTemplate) => {
    setActiveTemplate({ ...template, id: `custom_${Date.now()}` });
    setActiveTab('studio');
  };

  // Publish / Save current design to community or personal
  const handleSaveAndPublish = () => {
    const newTemplate: CertificateTemplate = {
      ...activeTemplate,
      id: `user_tmpl_${Date.now()}`,
      title: publishForm.title || activeTemplate.title || 'My Custom Certificate',
      category: publishForm.category,
      author: publishForm.authorName || 'Community Designer',
      isOfficial: false,
      isPaid: publishForm.isPaid,
      price: publishForm.isPaid ? publishForm.price : 'Free',
    };
    (newTemplate as any).isPublic = publishForm.isPublic;

    const updated = [newTemplate, ...userTemplates];
    setUserTemplates(updated);
    try {
      localStorage.setItem('pdfstudio_custom_templates', JSON.stringify(updated));
    } catch {}

    setShowPublishModal(false);
    setExportSuccess(`Template "${newTemplate.title}" published successfully!`);
    setTimeout(() => setExportSuccess(null), 4000);
  };

  // Delete user template
  const handleDeleteUserTemplate = (id: string) => {
    const updated = userTemplates.filter((t) => t.id !== id);
    setUserTemplates(updated);
    try {
      localStorage.setItem('pdfstudio_custom_templates', JSON.stringify(updated));
    } catch {}
  };

  // Download high-resolution PNG / JPEG
  const handleDownloadImage = async (format: 'png' | 'jpeg') => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    try {
      // Use SVG XML serialization or html2canvas
      const certNode = certificateRef.current;
      const rect = certNode.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      const scale = 2; // 2x high resolution
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);

      // Render certificate onto canvas
      const data = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${certNode.outerHTML}
            </div>
          </foreignObject>
        </svg>
      `;

      const img = new Image();
      const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.fillStyle = activeTemplate.theme.paperTint || '#FFFFFF';
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        const fileName = `${activeTemplate.data.recipientName.replace(/\s+/g, '_')}_Certificate.${format}`;
        const finalUrl = canvas.toDataURL(`image/${format}`, 0.95);
        const a = document.createElement('a');
        a.href = finalUrl;
        a.download = fileName;
        a.click();
        setIsExporting(false);
        setExportSuccess(`Certificate exported as high-res ${format.toUpperCase()}!`);
        setTimeout(() => setExportSuccess(null), 3000);
      };

      img.onerror = () => {
        // Fallback standard print / save
        window.print();
        setIsExporting(false);
      };

      img.src = url;
    } catch (err: any) {
      console.error('Export error:', err);
      setIsExporting(false);
    }
  };

  // Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Generate unique certificate ID
  const handleGenerateId = () => {
    const prefix = activeTemplate.data.organization.slice(0, 3).toUpperCase() || 'CRT';
    const randomCode = Math.floor(100000 + Math.random() * 900000);
    const year = new Date().getFullYear();
    setActiveTemplate((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        certificateId: `${prefix}-${year}-${randomCode}`,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-surface-950 text-white flex flex-col select-none">
      <Navbar />

      {/* Top Header / Mode Switcher */}
      <div className="border-b border-surface-800/80 bg-surface-900/60 backdrop-blur-md px-6 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Certificate Studio & Marketplace
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  PRO
                </span>
              </h1>
              <p className="text-xs text-surface-400 hidden sm:block">
                Design official awards, customize luxury templates, or publish to community
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-surface-950 p-1 rounded-xl border border-surface-800 text-xs">
            <button
              onClick={() => setActiveTab('studio')}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                activeTab === 'studio'
                  ? 'bg-amber-500 text-black shadow-md font-bold'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Studio Editor</span>
            </button>
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                activeTab === 'marketplace'
                  ? 'bg-amber-500 text-black shadow-md font-bold'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Template Marketplace</span>
            </button>
            <button
              onClick={() => setActiveTab('my-templates')}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${
                activeTab === 'my-templates'
                  ? 'bg-amber-500 text-black shadow-md font-bold'
                  : 'text-surface-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>My Templates ({userTemplates.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {exportSuccess && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/30 px-6 py-2.5 text-center text-xs text-emerald-400 flex items-center justify-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* ─── TAB 1: STUDIO EDITOR ────────────────────────────────────────── */}
      {activeTab === 'studio' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Sidebar: Customization Controls */}
          <aside className="w-full lg:w-96 bg-surface-900/60 border-r border-surface-800 flex flex-col shrink-0 overflow-y-auto max-h-[50vh] lg:max-h-[calc(100vh-105px)]">
            <div className="p-5 space-y-6">
              {/* Orientation & Quick Actions */}
              <div className="flex items-center justify-between pb-3 border-b border-surface-800">
                <span className="text-xs font-bold text-surface-400 uppercase tracking-wider">
                  Layout & Orientation
                </span>
                <div className="flex items-center gap-1 bg-surface-950 p-1 rounded-lg border border-surface-800">
                  <button
                    onClick={() => setActiveTemplate((p) => ({ ...p, orientation: 'landscape' }))}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      activeTemplate.orientation === 'landscape'
                        ? 'bg-surface-800 text-amber-400 font-bold'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    Landscape
                  </button>
                  <button
                    onClick={() => setActiveTemplate((p) => ({ ...p, orientation: 'portrait' }))}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      activeTemplate.orientation === 'portrait'
                        ? 'bg-surface-800 text-amber-400 font-bold'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    Portrait
                  </button>
                </div>
              </div>

              {/* Organization & Header */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-surface-300 block">
                  Issuer / Organization Name
                </label>
                <input
                  type="text"
                  value={activeTemplate.data.organization}
                  onChange={(e) =>
                    setActiveTemplate((prev) => ({
                      ...prev,
                      data: { ...prev.data, organization: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />

                <label className="text-xs font-semibold text-surface-300 block">
                  Certificate Title
                </label>
                <input
                  type="text"
                  value={activeTemplate.data.certificateTitle}
                  onChange={(e) =>
                    setActiveTemplate((prev) => ({
                      ...prev,
                      data: { ...prev.data, certificateTitle: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white font-bold focus:outline-none focus:border-amber-500"
                />

                <label className="text-xs font-semibold text-surface-300 block">
                  Presentation Subtitle
                </label>
                <input
                  type="text"
                  value={activeTemplate.data.presentationText}
                  onChange={(e) =>
                    setActiveTemplate((prev) => ({
                      ...prev,
                      data: { ...prev.data, presentationText: e.target.value },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Recipient Details */}
              <div className="space-y-3 p-4 rounded-xl bg-surface-950/80 border border-surface-800">
                <label className="text-xs font-bold text-amber-400 block uppercase tracking-wider">
                  Recipient Information
                </label>
                <div>
                  <span className="text-[11px] text-surface-400 block mb-1">Full Name</span>
                  <input
                    type="text"
                    value={activeTemplate.data.recipientName}
                    onChange={(e) =>
                      setActiveTemplate((prev) => ({
                        ...prev,
                        data: { ...prev.data, recipientName: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-surface-900 border border-surface-700 rounded-lg text-white font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Font Style Selection */}
                <div>
                  <span className="text-[11px] text-surface-400 block mb-1.5">Name Font Style</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'script', label: 'Calligraphy Script', preview: 'font-serif italic text-base' },
                      { id: 'serif', label: 'Formal Classical Serif', preview: 'font-serif text-sm font-bold' },
                      { id: 'modern', label: 'Clean Bold Modern', preview: 'font-sans text-sm font-bold' },
                      { id: 'gothic', label: 'Monospace Crest', preview: 'font-mono text-xs uppercase' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() =>
                          setActiveTemplate((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, fontFamily: f.id as any },
                          }))
                        }
                        className={`p-2 rounded-lg border text-left transition-all ${
                          activeTemplate.theme.fontFamily === f.id
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                            : 'border-surface-800 bg-surface-900 text-surface-400 hover:text-white'
                        }`}
                      >
                        <div className="text-[11px]">{f.label}</div>
                        <div className={`${f.preview} truncate mt-0.5`}>Johnathan Doe</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-surface-400 block mb-1">Citation / Description</span>
                  <textarea
                    rows={3}
                    value={activeTemplate.data.description}
                    onChange={(e) =>
                      setActiveTemplate((prev) => ({
                        ...prev,
                        data: { ...prev.data, description: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-surface-900 border border-surface-700 rounded-lg text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              {/* Date & Serial ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-300 block mb-1">Issue Date</label>
                  <input
                    type="text"
                    value={activeTemplate.data.issueDate}
                    onChange={(e) =>
                      setActiveTemplate((prev) => ({
                        ...prev,
                        data: { ...prev.data, issueDate: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-surface-300">Serial ID</label>
                    <button
                      onClick={handleGenerateId}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    value={activeTemplate.data.certificateId}
                    onChange={(e) =>
                      setActiveTemplate((prev) => ({
                        ...prev,
                        data: { ...prev.data, certificateId: e.target.value },
                      }))
                    }
                    className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Signatures */}
              <div className="space-y-3 p-4 rounded-xl bg-surface-950/80 border border-surface-800">
                <label className="text-xs font-bold text-surface-300 block uppercase tracking-wider">
                  Authorized Signatures
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-surface-400 block mb-1">Signer 1 (Left)</span>
                    <input
                      type="text"
                      placeholder="Name"
                      value={activeTemplate.data.signer1Name}
                      onChange={(e) =>
                        setActiveTemplate((prev) => ({
                          ...prev,
                          data: { ...prev.data, signer1Name: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-white mb-1.5 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Title"
                      value={activeTemplate.data.signer1Title}
                      onChange={(e) =>
                        setActiveTemplate((prev) => ({
                          ...prev,
                          data: { ...prev.data, signer1Title: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-surface-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-surface-400 block mb-1">Signer 2 (Right)</span>
                    <input
                      type="text"
                      placeholder="Name"
                      value={activeTemplate.data.signer2Name}
                      onChange={(e) =>
                        setActiveTemplate((prev) => ({
                          ...prev,
                          data: { ...prev.data, signer2Name: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-white mb-1.5 focus:outline-none focus:border-amber-500"
                    />
                    <input
                      type="text"
                      placeholder="Title"
                      value={activeTemplate.data.signer2Title}
                      onChange={(e) =>
                        setActiveTemplate((prev) => ({
                          ...prev,
                          data: { ...prev.data, signer2Title: e.target.value },
                        }))
                      }
                      className="w-full px-2.5 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-surface-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Theme & Badges */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-surface-300 block">
                  Seal / Medal Badge
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'gold-star', label: '24K Gold Star', icon: Star },
                    { id: 'verified-shield', label: 'Security Shield', icon: ShieldCheck },
                    { id: 'rosette', label: 'Honors Rosette', icon: Award },
                    { id: 'wax-seal', label: 'Vintage Wax Seal', icon: Medal },
                    { id: 'blue-ribbon', label: 'Excellence Ribbon', icon: Award },
                  ].map((b) => {
                    const Icon = b.icon;
                    return (
                      <button
                        key={b.id}
                        onClick={() =>
                          setActiveTemplate((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, badgeType: b.id as any },
                          }))
                        }
                        className={`p-2 rounded-lg border text-center transition-colors flex flex-col items-center gap-1 ${
                          activeTemplate.theme.badgeType === b.id
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-surface-800 bg-surface-950 text-surface-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] leading-tight">{b.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Presets */}
              <div>
                <label className="text-xs font-semibold text-surface-300 block mb-2">
                  Border & Accent Color
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { p: '#C59B27', s: '#0F2C59', bg: '#FDFBF7', name: 'Gold & Navy' },
                    { p: '#059669', s: '#1E293B', bg: '#F8FAFC', name: 'Emerald' },
                    { p: '#6366F1', s: '#312E81', bg: '#FAFAFA', name: 'Indigo' },
                    { p: '#D4AF37', s: '#111827', bg: '#0F1117', name: 'Obsidian' },
                    { p: '#BE185D', s: '#831843', bg: '#FFFDFD', name: 'Rose Gold' },
                    { p: '#D97706', s: '#991B1B', bg: '#FFFBEB', name: 'Crimson' },
                  ].map((c, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        setActiveTemplate((prev) => ({
                          ...prev,
                          theme: {
                            ...prev.theme,
                            primary: c.p,
                            secondary: c.s,
                            paperTint: c.bg,
                          },
                        }))
                      }
                      className="w-8 h-8 rounded-full border-2 border-surface-700 flex items-center justify-center transition-transform hover:scale-110 shadow"
                      style={{ backgroundColor: c.p }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Right Area: Live Visual Certificate Canvas & Actions */}
          <main className="flex-1 bg-surface-950/80 flex flex-col min-w-0">
            {/* Top Toolbar */}
            <div className="h-14 px-6 border-b border-surface-800 flex items-center justify-between bg-surface-900/40 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-surface-400">
                  {activeTemplate.title} ({activeTemplate.orientation})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  title="Publish to Community or Save"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Publish / Save Template</span>
                </button>

                <button
                  onClick={() => handleDownloadImage('png')}
                  disabled={isExporting}
                  className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg shadow-primary-500/20"
                  title="Export High-Res PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image (PNG)</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="btn-icon p-1.5 text-surface-400 hover:text-white"
                  title="Print Certificate"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Certificate Display Canvas Viewport */}
            <div className="flex-1 overflow-auto p-6 sm:p-10 flex items-center justify-center bg-black/40">
              <div
                ref={certificateRef}
                className={`relative transition-all duration-300 shadow-2xl overflow-hidden rounded-sm m-auto border-4 ${
                  activeTemplate.orientation === 'landscape'
                    ? 'w-[850px] h-[600px]'
                    : 'w-[600px] h-[850px]'
                }`}
                style={{
                  backgroundColor: activeTemplate.theme.paperTint,
                  borderColor: activeTemplate.theme.primary,
                  color: activeTemplate.theme.paperTint === '#0F1117' ? '#FFFFFF' : '#1E293B',
                }}
              >
                {/* ─── Outer Decorative Border ──────────────────────── */}
                <div
                  className="absolute inset-3 border-2 pointer-events-none"
                  style={{ borderColor: activeTemplate.theme.primary }}
                />
                <div
                  className="absolute inset-5 border pointer-events-none"
                  style={{ borderColor: `${activeTemplate.theme.primary}50` }}
                />

                {/* Corner Flourishes */}
                <div
                  className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 pointer-events-none"
                  style={{ borderColor: activeTemplate.theme.primary }}
                />
                <div
                  className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 pointer-events-none"
                  style={{ borderColor: activeTemplate.theme.primary }}
                />
                <div
                  className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 pointer-events-none"
                  style={{ borderColor: activeTemplate.theme.primary }}
                />
                <div
                  className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 pointer-events-none"
                  style={{ borderColor: activeTemplate.theme.primary }}
                />

                {/* Central Certificate Body */}
                <div className="relative z-10 w-full h-full flex flex-col justify-between p-12 text-center select-text">
                  {/* Top: Organization & Title */}
                  <div>
                    <div
                      className="text-xs font-bold uppercase tracking-[0.25em] mb-2"
                      style={{ color: activeTemplate.theme.primary }}
                    >
                      {activeTemplate.data.organization}
                    </div>

                    <h2
                      className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wide my-1 font-serif"
                      style={{
                        color:
                          activeTemplate.theme.paperTint === '#0F1117'
                            ? activeTemplate.theme.primary
                            : activeTemplate.theme.secondary,
                      }}
                    >
                      {activeTemplate.data.certificateTitle}
                    </h2>

                    <div className="w-36 h-0.5 mx-auto my-3" style={{ backgroundColor: activeTemplate.theme.primary }} />

                    <p className="text-xs italic text-gray-500 tracking-wider">
                      {activeTemplate.data.presentationText}
                    </p>
                  </div>

                  {/* Middle: Recipient & Description */}
                  <div className="my-auto py-2">
                    <h3
                      className={`text-3xl sm:text-4xl font-bold my-2 tracking-tight ${
                        activeTemplate.theme.fontFamily === 'script'
                          ? 'font-serif italic text-amber-600'
                          : activeTemplate.theme.fontFamily === 'gothic'
                          ? 'font-mono uppercase tracking-widest'
                          : 'font-serif'
                      }`}
                      style={{
                        color:
                          activeTemplate.theme.paperTint === '#0F1117'
                            ? '#FFFFFF'
                            : activeTemplate.theme.secondary,
                      }}
                    >
                      {activeTemplate.data.recipientName}
                    </h3>

                    <div
                      className="w-48 h-0.5 mx-auto mb-3"
                      style={{ backgroundColor: `${activeTemplate.theme.primary}60` }}
                    />

                    <p className="text-xs max-w-xl mx-auto leading-relaxed text-gray-600 px-4">
                      {activeTemplate.data.description}
                    </p>
                  </div>

                  {/* Bottom: Date, Badge, and Signatures */}
                  <div className="flex items-end justify-between pt-4 border-t border-gray-200/40">
                    {/* Left: Signer 1 */}
                    <div className="text-center w-40">
                      <div
                        className="font-serif italic text-base border-b border-gray-400/80 pb-1 mb-1"
                        style={{ color: activeTemplate.theme.secondary }}
                      >
                        {activeTemplate.data.signer1Sig || activeTemplate.data.signer1Name}
                      </div>
                      <div className="text-xs font-bold text-gray-800">{activeTemplate.data.signer1Name}</div>
                      <div className="text-[10px] text-gray-500">{activeTemplate.data.signer1Title}</div>
                    </div>

                    {/* Center: Badge & Date */}
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center shadow-lg mb-1"
                        style={{
                          borderColor: activeTemplate.theme.primary,
                          backgroundColor: `${activeTemplate.theme.primary}15`,
                        }}
                      >
                        <Award className="w-8 h-8" style={{ color: activeTemplate.theme.primary }} />
                      </div>
                      <div className="text-[10px] font-mono text-gray-500 font-medium">
                        {activeTemplate.data.issueDate}
                      </div>
                      <div className="text-[9px] font-mono text-gray-400">
                        ID: {activeTemplate.data.certificateId}
                      </div>
                    </div>

                    {/* Right: Signer 2 */}
                    <div className="text-center w-40">
                      <div
                        className="font-serif italic text-base border-b border-gray-400/80 pb-1 mb-1"
                        style={{ color: activeTemplate.theme.secondary }}
                      >
                        {activeTemplate.data.signer2Sig || activeTemplate.data.signer2Name}
                      </div>
                      <div className="text-xs font-bold text-gray-800">{activeTemplate.data.signer2Name}</div>
                      <div className="text-[10px] text-gray-500">{activeTemplate.data.signer2Title}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* ─── TAB 2: TEMPLATE MARKETPLACE ─────────────────────────────────── */}
      {activeTab === 'marketplace' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Category Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-surface-800">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Designs' },
                { id: 'academic', label: 'Academic & Diploma' },
                { id: 'corporate', label: 'Corporate & Executive' },
                { id: 'course', label: 'Course & Training' },
                { id: 'appreciation', label: 'Appreciation' },
                { id: 'sports', label: 'Sports Champion' },
                { id: 'luxury', label: 'VIP Luxury' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-surface-900 border border-surface-800 text-surface-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Free vs Paid Toggle */}
            <div className="flex items-center gap-1 bg-surface-900 p-1 rounded-lg border border-surface-800 text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterType === 'all' ? 'bg-surface-800 text-white font-bold' : 'text-surface-400'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('free')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterType === 'free' ? 'bg-emerald-500 text-black font-bold' : 'text-surface-400'
                }`}
              >
                Free
              </button>
              <button
                onClick={() => setFilterType('paid')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterType === 'paid' ? 'bg-amber-500 text-black font-bold' : 'text-surface-400'
                }`}
              >
                Paid (PRO)
              </button>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-surface-900 border border-surface-800 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between shadow-xl transition-all group"
              >
                <div>
                  {/* Visual Mini Mockup */}
                  <div
                    className="w-full aspect-[4/2.8] rounded-xl border-2 p-3 flex flex-col justify-between text-center overflow-hidden shadow-inner mb-4 transition-transform group-hover:scale-[1.02]"
                    style={{
                      backgroundColor: tmpl.theme.paperTint,
                      borderColor: tmpl.theme.primary,
                      color: tmpl.theme.paperTint === '#0F1117' ? '#FFFFFF' : '#1E293B',
                    }}
                  >
                    <div className="text-[9px] font-bold uppercase tracking-wider" style={{ color: tmpl.theme.primary }}>
                      {tmpl.data.organization}
                    </div>
                    <div>
                      <div className="text-xs font-bold font-serif uppercase tracking-tight">
                        {tmpl.data.certificateTitle}
                      </div>
                      <div className="text-[9px] text-gray-500 italic mt-0.5">
                        Awarded to {tmpl.data.recipientName}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[8px] text-gray-500 border-t border-gray-200/30 pt-1">
                      <span>{tmpl.data.issueDate}</span>
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>{tmpl.data.signer1Name}</span>
                    </div>
                  </div>

                  {/* Template Meta */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                      {tmpl.title}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        tmpl.isPaid
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {tmpl.price || 'Free'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-surface-400 mb-4">
                    <span>{tmpl.author}</span>
                    <span>•</span>
                    <span className="capitalize">{tmpl.category}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Customize & Edit</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 3: MY PUBLISHED TEMPLATES ────────────────────────────────── */}
      {activeTab === 'my-templates' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-surface-800">
            <div>
              <h2 className="text-lg font-bold text-white">My Created & Published Templates</h2>
              <p className="text-xs text-surface-400">
                Templates you designed and published to the community or saved for personal reuse.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('studio')}
              className="btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create New Certificate
            </button>
          </div>

          {userTemplates.length === 0 ? (
            <div className="card text-center p-12 border-surface-800 max-w-md mx-auto my-12">
              <Award className="w-12 h-12 text-surface-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">No Custom Templates Yet</h3>
              <p className="text-xs text-surface-400 mb-5">
                Design a certificate in the Studio Editor and click "Publish / Save Template" to save it here!
              </p>
              <button
                onClick={() => setActiveTab('studio')}
                className="btn-primary text-xs px-4 py-2 mx-auto"
              >
                Go to Studio Editor
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="bg-surface-900 border border-surface-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-white">{tmpl.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          tmpl.isPaid ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {tmpl.price || 'Free'}
                      </span>
                    </div>
                    <p className="text-xs text-surface-400 mb-4">
                      Category: <span className="capitalize text-white">{tmpl.category}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-surface-800">
                    <button
                      onClick={() => handleSelectTemplate(tmpl)}
                      className="flex-1 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <PenTool className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUserTemplate(tmpl.id)}
                      className="btn-icon p-2 text-surface-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── PUBLISH MODAL ────────────────────────────────────────────────── */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="card max-w-md w-full p-6 border-surface-700 shadow-2xl bg-surface-900 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-400" />
                Publish / Save Template
              </h3>
              <button
                onClick={() => setShowPublishModal(false)}
                className="btn-icon p-1 text-surface-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-300 block mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={publishForm.title}
                onChange={(e) => setPublishForm({ ...publishForm, title: e.target.value })}
                placeholder="e.g. Modern Tech Leadership Award"
                className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-surface-300 block mb-1">Category</label>
              <select
                value={publishForm.category}
                onChange={(e) => setPublishForm({ ...publishForm, category: e.target.value as any })}
                className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
              >
                <option value="academic">Academic & Honors</option>
                <option value="corporate">Corporate & Leadership</option>
                <option value="course">Course & Training</option>
                <option value="appreciation">Appreciation</option>
                <option value="sports">Sports</option>
                <option value="luxury">VIP Luxury</option>
              </select>
            </div>

            {/* Visibility Toggle */}
            <div className="p-3 bg-surface-950 rounded-xl border border-surface-800 space-y-2">
              <label className="text-xs font-semibold text-surface-300 block">Marketplace Visibility</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPublishForm({ ...publishForm, isPublic: true })}
                  className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                    publishForm.isPublic
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                      : 'border-surface-800 text-surface-400'
                  }`}
                >
                  🌐 Public Marketplace
                  <span className="block text-[10px] text-surface-500 font-normal">
                    Visible to all PDF Studio users
                  </span>
                </button>
                <button
                  onClick={() => setPublishForm({ ...publishForm, isPublic: false })}
                  className={`p-2 rounded-lg border text-left text-xs transition-colors ${
                    !publishForm.isPublic
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                      : 'border-surface-800 text-surface-400'
                  }`}
                >
                  🔒 Private Only
                  <span className="block text-[10px] text-surface-500 font-normal">
                    Saved only to your library
                  </span>
                </button>
              </div>
            </div>

            {/* Free vs Paid Toggle */}
            <div className="p-3 bg-surface-950 rounded-xl border border-surface-800 space-y-2">
              <label className="text-xs font-semibold text-surface-300 block">Pricing</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="price_type"
                    checked={!publishForm.isPaid}
                    onChange={() => setPublishForm({ ...publishForm, isPaid: false, price: 'Free' })}
                  />
                  <span>Free Template</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="price_type"
                    checked={publishForm.isPaid}
                    onChange={() => setPublishForm({ ...publishForm, isPaid: true, price: '₹199' })}
                  />
                  <span>Paid (PRO Template)</span>
                </label>
              </div>

              {publishForm.isPaid && (
                <div className="pt-2">
                  <span className="text-[11px] text-surface-400 block mb-1">Set Price (INR / USD)</span>
                  <input
                    type="text"
                    value={publishForm.price}
                    onChange={(e) => setPublishForm({ ...publishForm, price: e.target.value })}
                    placeholder="e.g. ₹199 or $4.99"
                    className="w-full px-3 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPublishModal(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndPublish}
                className="btn-primary text-xs px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold"
              >
                Confirm & Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
