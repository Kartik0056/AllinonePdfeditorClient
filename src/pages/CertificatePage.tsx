/**
 * Certificate Studio & Marketplace
 * Full Professional Certificate Design Tool from scratch + Template Marketplace
 *
 * Capabilities:
 * - Create from scratch (Blank Canvas) or choose predesigned templates
 * - Designed borders: Royal Guilloche, Vintage Crest, Modern Geometric, Diploma Classic, Botanical Filigree, Minimal
 * - Security Backgrounds: Banknote Guilloche waves, Parchment, Linen, Marble, Obsidian, Clean White
 * - Seals & Badges: 24K Gold Embossed Seal with Ribbons, Red Notary Wax Seal, Security Shield, Rosette, Custom Upload
 * - Organization Logo / Crest: Presets or Custom Logo Upload
 * - Signatures Studio: 1 or 2 signers, handwritten script styles, digital draw, custom signature upload
 * - Verification QR Code & Auto Serial ID
 * - Community Marketplace: Publish as Public/Private, Free or Paid with custom price
 * - High-Res 2x PNG Export, PDF Export, and Print
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Award, Download, Sparkles, Plus, Share2, Check, Copy, Eye,
  Printer, Layers, Palette, FileText, CheckCircle2, ShieldCheck,
  Medal, Star, RefreshCw, Sliders, ExternalLink, Lock, DollarSign,
  Upload, Trash2, ChevronRight, PenTool, Layout, ArrowLeft,
  QrCode, Stamp, Shield, Image as ImageIcon, CheckSquare, Square
} from 'lucide-react';
import Navbar from '../components/Navbar';

// ─── Types & Interfaces ──────────────────────────────────────────────────

export type CertificateCategory = 'all' | 'academic' | 'corporate' | 'course' | 'appreciation' | 'sports' | 'luxury';

export type BorderStyle =
  | 'royal-guilloche'
  | 'vintage-crest'
  | 'modern-geometric'
  | 'diploma-classic'
  | 'botanical-filigree'
  | 'minimal-line'
  | 'none';

export type BadgeType =
  | 'gold-star'
  | 'wax-seal'
  | 'verified-shield'
  | 'rosette'
  | 'blue-ribbon'
  | 'custom'
  | 'none';

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
    borderStyle: BorderStyle;
    borderWidth: 'fine' | 'medium' | 'bold';
    cornerOrnaments: boolean;
    watermarkType: 'guilloche' | 'parchment' | 'linen' | 'none';
    badgeType: BadgeType;
    badgePosition: 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-right';
    customBadgeUrl?: string;
    fontFamily: 'script' | 'serif' | 'modern' | 'gothic' | 'greatvibes';
    recipientFontSize: 'sm' | 'md' | 'lg' | 'xl';
    showQrCode: boolean;
    showSigner2: boolean;
    customLogoUrl?: string;
    logoType: 'laurel' | 'shield' | 'eagle' | 'custom' | 'none';
  };
  data: {
    organization: string;
    certificateTitle: string;
    presentationText: string;
    recipientName: string;
    description: string;
    additionalDetails?: string;
    issueDate: string;
    certificateId: string;
    signer1Name: string;
    signer1Title: string;
    signer1Sig: string;
    signer1SigType: 'font' | 'image';
    signer1SigImage?: string;
    signer2Name: string;
    signer2Title: string;
    signer2Sig: string;
    signer2SigType: 'font' | 'image';
    signer2SigImage?: string;
  };
}

// ─── Blank Canvas Template for Creating From Scratch ────────────────────

export const BLANK_CERTIFICATE_TEMPLATE: CertificateTemplate = {
  id: 'blank-scratch-canvas',
  title: 'Custom Certificate (From Scratch)',
  category: 'academic',
  author: 'My Custom Design',
  isOfficial: false,
  isPaid: false,
  price: 'Free',
  orientation: 'landscape',
  theme: {
    primary: '#C59B27',
    secondary: '#0F2C59',
    background: '#0B132B',
    paperTint: '#FFFFFF',
    borderStyle: 'royal-guilloche',
    borderWidth: 'medium',
    cornerOrnaments: true,
    watermarkType: 'guilloche',
    badgeType: 'gold-star',
    badgePosition: 'bottom-center',
    fontFamily: 'script',
    recipientFontSize: 'lg',
    showQrCode: true,
    showSigner2: true,
    logoType: 'laurel',
  },
  data: {
    organization: 'YOUR INSTITUTION / ORGANIZATION NAME',
    certificateTitle: 'CERTIFICATE OF ACHIEVEMENT',
    presentationText: 'This is proudly presented to',
    recipientName: 'Recipient Full Name',
    description: 'for exceptional dedication, outstanding performance, and successfully meeting all high-standard requirements with distinction.',
    additionalDetails: 'Awarded with Highest Honors & Excellence',
    issueDate: 'September 21, 2026',
    certificateId: 'CERT-2026-001',
    signer1Name: 'Authorized Signer 1',
    signer1Title: 'Director & Dean',
    signer1Sig: 'Director Sign',
    signer1SigType: 'font',
    signer2Name: 'Authorized Signer 2',
    signer2Title: 'Program Chair',
    signer2Sig: 'Chair Sign',
    signer2SigType: 'font',
  },
};

// ─── Official Predesigned Templates ─────────────────────────────────────

const OFFICIAL_TEMPLATES: CertificateTemplate[] = [
  {
    id: 'tmpl-academic-gold',
    title: 'Academic Honors & University Diploma',
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
      borderStyle: 'royal-guilloche',
      borderWidth: 'medium',
      cornerOrnaments: true,
      watermarkType: 'guilloche',
      badgeType: 'gold-star',
      badgePosition: 'bottom-center',
      fontFamily: 'serif',
      recipientFontSize: 'lg',
      showQrCode: true,
      showSigner2: true,
      logoType: 'laurel',
    },
    data: {
      organization: 'OXFORD ACADEMY OF ADVANCED SCIENCES',
      certificateTitle: 'CERTIFICATE OF ACADEMIC EXCELLENCE',
      presentationText: 'This diploma is proudly awarded to',
      recipientName: 'Alexander Montgomery',
      description: 'for demonstrating exceptional scholarly achievement, rigorous academic discipline, and peerless dedication to scientific inquiry during the 2025-2026 Academic Honors Program.',
      additionalDetails: 'Summa Cum Laude with Highest Distinction',
      issueDate: 'September 21, 2026',
      certificateId: 'OXF-HON-2026-98421',
      signer1Name: 'Dr. Arthur Pendelton',
      signer1Title: 'Dean of Academic Affairs',
      signer1Sig: 'Arthur Pendelton',
      signer1SigType: 'font',
      signer2Name: 'Prof. Margaret Sterling',
      signer2Title: 'Chancellor of Faculty',
      signer2Sig: 'Margaret Sterling',
      signer2SigType: 'font',
    },
  },
  {
    id: 'tmpl-corporate-excellence',
    title: 'Corporate Leadership & Executive Award',
    category: 'corporate',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: false,
    price: 'Free',
    orientation: 'landscape',
    theme: {
      primary: '#059669',
      secondary: '#0F172A',
      background: '#022C22',
      paperTint: '#F8FAFC',
      borderStyle: 'modern-geometric',
      borderWidth: 'medium',
      cornerOrnaments: true,
      watermarkType: 'linen',
      badgeType: 'verified-shield',
      badgePosition: 'bottom-center',
      fontFamily: 'modern',
      recipientFontSize: 'lg',
      showQrCode: true,
      showSigner2: true,
      logoType: 'shield',
    },
    data: {
      organization: 'GLOBAL ENTERPRISE SOLUTIONS INC.',
      certificateTitle: 'EXECUTIVE LEADERSHIP EXCELLENCE',
      presentationText: 'In formal recognition of strategic visionary leadership to',
      recipientName: 'Victoria E. Vance',
      description: 'for exemplary leadership, outstanding quarterly business impact, fostering an innovative team culture, and driving sustainable organizational transformation.',
      additionalDetails: 'Global Operations Excellence Award',
      issueDate: 'September 21, 2026',
      certificateId: 'GES-EXEC-2026-4421',
      signer1Name: 'Marcus Sterling',
      signer1Title: 'Chief Executive Officer',
      signer1Sig: 'Marcus Sterling',
      signer1SigType: 'font',
      signer2Name: 'Elena Rostova',
      signer2Title: 'VP Global People Operations',
      signer2Sig: 'Elena Rostova',
      signer2SigType: 'font',
    },
  },
  {
    id: 'tmpl-course-completion',
    title: 'Professional Tech & AI Specialization',
    category: 'course',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: true,
    price: '₹199',
    orientation: 'landscape',
    theme: {
      primary: '#6366F1',
      secondary: '#1E1B4B',
      background: '#0F172A',
      paperTint: '#FAFAFA',
      borderStyle: 'diploma-classic',
      borderWidth: 'medium',
      cornerOrnaments: true,
      watermarkType: 'guilloche',
      badgeType: 'blue-ribbon',
      badgePosition: 'bottom-center',
      fontFamily: 'modern',
      recipientFontSize: 'lg',
      showQrCode: true,
      showSigner2: true,
      logoType: 'eagle',
    },
    data: {
      organization: 'INSTITUTE OF APPLIED ARTIFICIAL INTELLIGENCE',
      certificateTitle: 'CERTIFICATE OF SPECIALIZATION',
      presentationText: 'This is to officially certify that',
      recipientName: 'David K. Reynolds',
      description: 'has completed the rigorous 120-hour Advanced Machine Learning, LLM Architecture, and Neural System Design Certification with distinction.',
      additionalDetails: 'Verification Code: ML-CERT-9942',
      issueDate: 'September 21, 2026',
      certificateId: 'IAAI-ML-884219',
      signer1Name: 'Dr. Sanjay Patel',
      signer1Title: 'Head of AI Curriculum',
      signer1Sig: 'Sanjay Patel',
      signer1SigType: 'font',
      signer2Name: 'Sarah Jenkins',
      signer2Title: 'Lead Certification Director',
      signer2Sig: 'Sarah Jenkins',
      signer2SigType: 'font',
    },
  },
  {
    id: 'tmpl-luxury-vip',
    title: 'Obsidian & 24K Gold VIP Citation',
    category: 'luxury',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: true,
    price: '₹299',
    orientation: 'landscape',
    theme: {
      primary: '#D4AF37',
      secondary: '#F1F5F9',
      background: '#05070A',
      paperTint: '#0F1117',
      borderStyle: 'vintage-crest',
      borderWidth: 'bold',
      cornerOrnaments: true,
      watermarkType: 'guilloche',
      badgeType: 'wax-seal',
      badgePosition: 'bottom-center',
      fontFamily: 'greatvibes',
      recipientFontSize: 'xl',
      showQrCode: true,
      showSigner2: true,
      logoType: 'laurel',
    },
    data: {
      organization: 'IMPERIAL FELLOWSHIP OF THE ARTS & SCIENCES',
      certificateTitle: 'HONORARY FELLOWSHIP CITATION',
      presentationText: 'Conferred by unanimous election of the Board of Governors upon',
      recipientName: 'Elizabeth Montgomery-Cross',
      description: 'in profound acknowledgment of peerless patronage, enduring philanthropy, and transformational contributions to international cultural heritage.',
      additionalDetails: 'Knight Grand Cross Order of Merit',
      issueDate: 'September 21, 2026',
      certificateId: 'IMP-FEL-2026-007',
      signer1Name: 'Lord Henry Alistair',
      signer1Title: 'President of the Royal Guild',
      signer1Sig: 'Henry Alistair',
      signer1SigType: 'font',
      signer2Name: 'Dame Clarissa Finch',
      signer2Title: 'Senior Trustee',
      signer2Sig: 'Clarissa Finch',
      signer2SigType: 'font',
    },
  },
  {
    id: 'tmpl-appreciation-rose',
    title: 'Heartfelt Appreciation & Service Recognition',
    category: 'appreciation',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: false,
    price: 'Free',
    orientation: 'landscape',
    theme: {
      primary: '#BE185D',
      secondary: '#4A044E',
      background: '#2A0845',
      paperTint: '#FFFDFD',
      borderStyle: 'botanical-filigree',
      borderWidth: 'medium',
      cornerOrnaments: true,
      watermarkType: 'parchment',
      badgeType: 'rosette',
      badgePosition: 'bottom-center',
      fontFamily: 'script',
      recipientFontSize: 'lg',
      showQrCode: true,
      showSigner2: false,
      logoType: 'laurel',
    },
    data: {
      organization: 'HOPE FOUNDATION WORLDWIDE',
      certificateTitle: 'CERTIFICATE OF VOLUNTEER APPRECIATION',
      presentationText: 'With immense gratitude, this honor is bestowed upon',
      recipientName: 'Sophia Ananya Roy',
      description: 'for selflessly dedicating over 500 hours of community disaster relief, humanitarian leadership, and compassionate service to children in need.',
      additionalDetails: 'Humanitarian Hero Recognition 2026',
      issueDate: 'September 21, 2026',
      certificateId: 'HP-APP-2026-118',
      signer1Name: 'Father Joseph Bradley',
      signer1Title: 'Executive Mission Director',
      signer1Sig: 'Joseph Bradley',
      signer1SigType: 'font',
      signer2Name: '',
      signer2Title: '',
      signer2Sig: '',
      signer2SigType: 'font',
    },
  },
  {
    id: 'tmpl-sports-trophy',
    title: 'National Championship & Sports Trophy',
    category: 'sports',
    author: 'PDF Studio Official',
    isOfficial: true,
    isPaid: false,
    price: 'Free',
    orientation: 'landscape',
    theme: {
      primary: '#D97706',
      secondary: '#7F1D1D',
      background: '#450A0A',
      paperTint: '#FFFBEB',
      borderStyle: 'vintage-crest',
      borderWidth: 'medium',
      cornerOrnaments: true,
      watermarkType: 'guilloche',
      badgeType: 'gold-star',
      badgePosition: 'bottom-center',
      fontFamily: 'modern',
      recipientFontSize: 'xl',
      showQrCode: true,
      showSigner2: true,
      logoType: 'eagle',
    },
    data: {
      organization: 'NATIONAL ATHLETICS ASSOCIATION',
      certificateTitle: 'GOLD MEDAL CHAMPIONSHIP CITATION',
      presentationText: 'Awarded with highest athletic distinction to',
      recipientName: 'Karanvir Singh Rajput',
      description: 'for securing First Place and setting a new national record in the Men’s 400m Senior Sprint Championship 2026.',
      additionalDetails: 'Record: 44.18s · National Gold Standard',
      issueDate: 'September 21, 2026',
      certificateId: 'NAA-GOLD-2026-781',
      signer1Name: 'Major Rajiv Sharma',
      signer1Title: 'President of Sports Federation',
      signer1Sig: 'Rajiv Sharma',
      signer1SigType: 'font',
      signer2Name: 'Coach Vikram Rathore',
      signer2Title: 'Chief Athletics Coach',
      signer2Sig: 'Vikram Rathore',
      signer2SigType: 'font',
    },
  },
];

// ─── Component: CertificatePage ──────────────────────────────────────────

export default function CertificatePage() {
  const [activeTab, setActiveTab] = useState<'studio' | 'marketplace' | 'my-templates'>('studio');
  const [studioToolTab, setStudioToolTab] = useState<'border' | 'content' | 'badges' | 'signatures' | 'style'>('border');
  const [activeTemplate, setActiveTemplate] = useState<CertificateTemplate>(OFFICIAL_TEMPLATES[0]);

  // Marketplace states
  const [selectedCategory, setSelectedCategory] = useState<CertificateCategory>('all');
  const [filterType, setFilterType] = useState<'all' | 'free' | 'paid'>('all');

  // Custom User Templates
  const [userTemplates, setUserTemplates] = useState<CertificateTemplate[]>([]);

  // Export / Print states
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Publish Modal
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({
    title: '',
    category: 'academic' as CertificateCategory,
    isPublic: true,
    isPaid: false,
    price: 'Free',
    authorName: '',
  });

  const certificateRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const badgeInputRef = useRef<HTMLInputElement>(null);
  const sig1InputRef = useRef<HTMLInputElement>(null);
  const sig2InputRef = useRef<HTMLInputElement>(null);

  // Load user saved templates from localStorage
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

  // Combined Marketplace Templates
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

  // Start from scratch (blank canvas)
  const handleStartFromScratch = () => {
    setActiveTemplate({
      ...BLANK_CERTIFICATE_TEMPLATE,
      id: `scratch_${Date.now()}`,
    });
    setActiveTab('studio');
    setStudioToolTab('border');
  };

  // Select a template from marketplace
  const handleSelectTemplate = (template: CertificateTemplate) => {
    setActiveTemplate({ ...template, id: `custom_${Date.now()}` });
    setActiveTab('studio');
  };

  // Publish current design
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
    setExportSuccess(`Template "${newTemplate.title}" saved & published successfully!`);
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

  // Auto-generate Certificate ID
  const handleGenerateId = () => {
    const random = Math.floor(100000 + Math.random() * 900000);
    const prefix = activeTemplate.data.organization.substring(0, 3).toUpperCase() || 'CRT';
    setActiveTemplate((prev) => ({
      ...prev,
      data: { ...prev.data, certificateId: `${prefix}-${new Date().getFullYear()}-${random}` },
    }));
  };

  // Image upload helpers (Logo, Badge, Signatures)
  const handleFileUpload = (file: File, callback: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      callback(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Download High-Resolution 2x PNG
  const handleDownloadImage = async () => {
    if (!certificateRef.current) return;
    setIsExporting(true);
    try {
      const certNode = certificateRef.current;
      const rect = certNode.getBoundingClientRect();
      const scale = 2; // 2x crisp print scale
      const canvas = document.createElement('canvas');
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(scale, scale);

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

        const a = document.createElement('a');
        a.download = `${activeTemplate.data.recipientName.replace(/\s+/g, '_')}_Certificate.png`;
        a.href = canvas.toDataURL('image/png', 1.0);
        a.click();
        setIsExporting(false);
        setExportSuccess('Certificate image downloaded successfully!');
        setTimeout(() => setExportSuccess(null), 3000);
      };

      img.onerror = () => {
        window.print();
        setIsExporting(false);
      };
      img.src = url;
    } catch {
      window.print();
      setIsExporting(false);
    }
  };

  // Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  const isDarkMode = activeTemplate.theme.paperTint === '#0F1117';
  const textColor = isDarkMode ? '#FFFFFF' : '#1E293B';
  const subtextColor = isDarkMode ? '#94A3B8' : '#64748B';

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col">
      <Navbar />

      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-surface-950 via-surface-900 to-surface-950 border-b border-surface-800/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Award className="w-5 h-5 text-black font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-white tracking-tight">
                  Certificate <span className="text-amber-400">Studio & Creator</span>
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                  PRO TOOL
                </span>
              </div>
              <p className="text-xs text-surface-400">
                Design custom certificates from scratch or customize templates with authentic borders, seals & signatures.
              </p>
            </div>
          </div>

          {/* Top Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'studio'
                  ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                  : 'text-surface-300 hover:text-white hover:bg-surface-800'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Studio Editor</span>
            </button>

            <button
              onClick={() => setActiveTab('marketplace')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'marketplace'
                  ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                  : 'text-surface-300 hover:text-white hover:bg-surface-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Template Marketplace</span>
            </button>

            <button
              onClick={() => setActiveTab('my-templates')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'my-templates'
                  ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                  : 'text-surface-300 hover:text-white hover:bg-surface-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>My Templates ({userTemplates.length})</span>
            </button>

            {/* Direct Create from Scratch button */}
            <button
              onClick={handleStartFromScratch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-500/25 ml-2"
              title="Start a fresh blank certificate design"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New From Scratch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {exportSuccess && (
        <div className="fixed top-16 right-6 z-50 bg-emerald-500 text-black px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 font-bold text-xs animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* ─── TAB 1: STUDIO EDITOR ────────────────────────────────────────── */}
      {activeTab === 'studio' && (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Control Panel */}
          <aside className="w-full lg:w-[420px] bg-surface-900 border-b lg:border-b-0 lg:border-r border-surface-800 flex flex-col shrink-0 overflow-y-auto max-h-[45vh] lg:max-h-[calc(100vh-130px)]">
            {/* Studio Tools Navigation */}
            <div className="grid grid-cols-5 p-2 bg-surface-950/80 border-b border-surface-800 text-[11px] font-semibold">
              {[
                { id: 'border', label: 'Border', icon: Layout },
                { id: 'content', label: 'Content', icon: FileText },
                { id: 'badges', label: 'Seals', icon: Stamp },
                { id: 'signatures', label: 'Signers', icon: PenTool },
                { id: 'style', label: 'Colors', icon: Palette },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = studioToolTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setStudioToolTab(tab.id as any)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-colors ${
                      active
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'text-surface-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-5 space-y-6">
              {/* ─── TOOL TAB 1: BORDERS & FRAMES ──────────────────────────── */}
              {studioToolTab === 'border' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-white block mb-1">
                      Certificate Border Style
                    </label>
                    <p className="text-[11px] text-surface-400 mb-3">
                      Select an authentic designed certificate frame.
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'royal-guilloche', label: 'Royal Guilloche', desc: 'Wavy vector loops & vintage scrolls' },
                        { id: 'vintage-crest', label: 'Vintage Gold Crest', desc: 'Double frame with corner rosettes' },
                        { id: 'modern-geometric', label: 'Modern Geometric', desc: 'Diagonal chamfers & dual rules' },
                        { id: 'diploma-classic', label: 'Diploma Classic', desc: 'Formal triple institutional border' },
                        { id: 'botanical-filigree', label: 'Botanical Filigree', desc: 'Leafy floral corners & vines' },
                        { id: 'minimal-line', label: 'Minimalist Clean', desc: 'Modern refined hairline frame' },
                        { id: 'none', label: 'Borderless', desc: 'Clean borderless canvas' },
                      ].map((b) => (
                        <button
                          key={b.id}
                          onClick={() =>
                            setActiveTemplate((prev) => ({
                              ...prev,
                              theme: { ...prev.theme, borderStyle: b.id as BorderStyle },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            activeTemplate.theme.borderStyle === b.id
                              ? 'border-amber-500 bg-amber-500/10 text-amber-300 shadow-sm'
                              : 'border-surface-800 bg-surface-950 text-surface-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-bold text-white mb-0.5">{b.label}</div>
                          <div className="text-[10px] text-surface-500 leading-tight">{b.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Corner Ornaments Toggle */}
                  <div className="flex items-center justify-between p-3 bg-surface-950 rounded-xl border border-surface-800">
                    <div>
                      <span className="text-xs font-semibold text-white block">Corner Ornaments</span>
                      <span className="text-[10px] text-surface-400 block">Flourishes and crest medallions on corners</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTemplate((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, cornerOrnaments: !prev.theme.cornerOrnaments },
                        }))
                      }
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        activeTemplate.theme.cornerOrnaments ? 'bg-amber-500' : 'bg-surface-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          activeTemplate.theme.cornerOrnaments ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Border Thickness */}
                  <div>
                    <label className="text-xs font-semibold text-surface-300 block mb-1.5">
                      Border Thickness
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['fine', 'medium', 'bold'] as const).map((w) => (
                        <button
                          key={w}
                          onClick={() =>
                            setActiveTemplate((prev) => ({
                              ...prev,
                              theme: { ...prev.theme, borderWidth: w },
                            }))
                          }
                          className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                            activeTemplate.theme.borderWidth === w
                              ? 'bg-amber-500 text-black'
                              : 'bg-surface-950 border border-surface-800 text-surface-400'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Security Background Pattern / Watermark */}
                  <div>
                    <label className="text-xs font-semibold text-surface-300 block mb-1.5">
                      Security Paper Texture / Watermark
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'guilloche', label: 'Banknote Waves', desc: 'Security anti-copy wave patterns' },
                        { id: 'parchment', label: 'Vintage Parchment', desc: 'Warm aged diploma grain' },
                        { id: 'linen', label: 'Linen Weave', desc: 'Subtle textured cotton paper' },
                        { id: 'none', label: 'Pure Solid', desc: 'Clean flat surface' },
                      ].map((w) => (
                        <button
                          key={w.id}
                          onClick={() =>
                            setActiveTemplate((prev) => ({
                              ...prev,
                              theme: { ...prev.theme, watermarkType: w.id as any },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-left transition-colors ${
                            activeTemplate.theme.watermarkType === w.id
                              ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                              : 'border-surface-800 bg-surface-950 text-surface-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-bold text-white">{w.label}</div>
                          <div className="text-[10px] text-surface-500 leading-tight">{w.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Layout Orientation */}
                  <div>
                    <label className="text-xs font-semibold text-surface-300 block mb-1.5">
                      Page Orientation
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setActiveTemplate((p) => ({ ...p, orientation: 'landscape' }))}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${
                          activeTemplate.orientation === 'landscape'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-surface-800 text-surface-400'
                        }`}
                      >
                        <span>Landscape (Horizontal)</span>
                      </button>
                      <button
                        onClick={() => setActiveTemplate((p) => ({ ...p, orientation: 'portrait' }))}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 ${
                          activeTemplate.orientation === 'portrait'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-surface-800 text-surface-400'
                        }`}
                      >
                        <span>Portrait (Vertical)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TOOL TAB 2: CONTENT & TEXT ────────────────────────────── */}
              {studioToolTab === 'content' && (
                <div className="space-y-4">
                  {/* Organization Logo / Crest */}
                  <div>
                    <label className="text-xs font-bold text-white block mb-1">
                      Organization Crest / Logo
                    </label>
                    <div className="flex items-center gap-2 mb-2">
                      {[
                        { id: 'laurel', label: 'Academic Laurel' },
                        { id: 'shield', label: 'Security Shield' },
                        { id: 'eagle', label: 'Excellence Eagle' },
                        { id: 'none', label: 'No Logo' },
                      ].map((l) => (
                        <button
                          key={l.id}
                          onClick={() =>
                            setActiveTemplate((prev) => ({
                              ...prev,
                              theme: { ...prev.theme, logoType: l.id as any },
                            }))
                          }
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                            activeTemplate.theme.logoType === l.id
                              ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                              : 'border-surface-800 bg-surface-950 text-surface-400'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>

                    {/* Custom Logo Upload */}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={logoInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            handleFileUpload(f, (url) => {
                              setActiveTemplate((p) => ({
                                ...p,
                                theme: { ...p.theme, customLogoUrl: url, logoType: 'custom' },
                              }));
                            });
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="btn-ghost text-xs py-1.5 px-3 border border-surface-700 hover:border-amber-500 flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>Upload Custom Logo</span>
                      </button>
                      {activeTemplate.theme.customLogoUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveTemplate((p) => ({
                              ...p,
                              theme: { ...p.theme, customLogoUrl: undefined, logoType: 'laurel' },
                            }))
                          }
                          className="btn-ghost text-xs p-1.5 text-red-400"
                          title="Remove custom logo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-surface-300 block mb-1">
                      Organization / Issuer Name
                    </label>
                    <input
                      type="text"
                      value={activeTemplate.data.organization}
                      onChange={(e) =>
                        setActiveTemplate((p) => ({
                          ...p,
                          data: { ...p.data, organization: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-surface-300 block mb-1">
                      Certificate Title
                    </label>
                    <input
                      type="text"
                      value={activeTemplate.data.certificateTitle}
                      onChange={(e) =>
                        setActiveTemplate((p) => ({
                          ...p,
                          data: { ...p.data, certificateTitle: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-surface-300 block mb-1">
                      Presentation Subtitle
                    </label>
                    <input
                      type="text"
                      value={activeTemplate.data.presentationText}
                      onChange={(e) =>
                        setActiveTemplate((p) => ({
                          ...p,
                          data: { ...p.data, presentationText: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Recipient Box */}
                  <div className="p-3.5 bg-surface-950 rounded-xl border border-surface-800 space-y-3">
                    <label className="text-xs font-bold text-amber-400 block uppercase tracking-wider">
                      Recipient Full Name
                    </label>
                    <input
                      type="text"
                      value={activeTemplate.data.recipientName}
                      onChange={(e) =>
                        setActiveTemplate((p) => ({
                          ...p,
                          data: { ...p.data, recipientName: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-sm bg-surface-900 border border-surface-700 rounded-lg text-white font-bold focus:outline-none focus:border-amber-500"
                      placeholder="e.g. Alexander Montgomery"
                    />

                    {/* Font Style Selection */}
                    <div>
                      <span className="text-[11px] text-surface-400 block mb-1">Recipient Font Style</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'greatvibes', label: 'Elegant Calligraphy', sample: 'font-serif italic' },
                          { id: 'serif', label: 'Classical Serif', sample: 'font-serif font-bold' },
                          { id: 'script', label: 'Handwritten Script', sample: 'font-serif italic' },
                          { id: 'modern', label: 'Modern Sans Bold', sample: 'font-sans font-bold' },
                          { id: 'gothic', label: 'Monospace Crest', sample: 'font-mono' },
                        ].map((f) => (
                          <button
                            key={f.id}
                            onClick={() =>
                              setActiveTemplate((p) => ({
                                ...p,
                                theme: { ...p.theme, fontFamily: f.id as any },
                              }))
                            }
                            className={`p-2 rounded-lg border text-left transition-colors ${
                              activeTemplate.theme.fontFamily === f.id
                                ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                                : 'border-surface-800 bg-surface-900 text-surface-400'
                            }`}
                          >
                            <div className="text-[10px]">{f.label}</div>
                            <div className={`text-xs truncate ${f.sample} mt-0.5 text-white`}>John Doe</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size Slider */}
                    <div>
                      <span className="text-[11px] text-surface-400 block mb-1">Name Font Size</span>
                      <div className="grid grid-cols-4 gap-1">
                        {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() =>
                              setActiveTemplate((p) => ({
                                ...p,
                                theme: { ...p.theme, recipientFontSize: s },
                              }))
                            }
                            className={`py-1 rounded text-xs font-bold uppercase ${
                              activeTemplate.theme.recipientFontSize === s
                                ? 'bg-amber-500 text-black'
                                : 'bg-surface-900 border border-surface-800 text-surface-400'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-surface-300 block mb-1">
                      Citation / Description Text
                    </label>
                    <textarea
                      rows={3}
                      value={activeTemplate.data.description}
                      onChange={(e) =>
                        setActiveTemplate((p) => ({
                          ...p,
                          data: { ...p.data, description: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white focus:outline-none focus:border-amber-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-surface-300 block mb-1">
                      Additional Details (Grade / Location / Distinction)
                    </label>
                    <input
                      type="text"
                      value={activeTemplate.data.additionalDetails || ''}
                      onChange={(e) =>
                        setActiveTemplate((p) => ({
                          ...p,
                          data: { ...p.data, additionalDetails: e.target.value },
                        }))
                      }
                      placeholder="e.g. Summa Cum Laude with Highest Distinction"
                      className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-surface-300 block mb-1">Issue Date</label>
                      <input
                        type="text"
                        value={activeTemplate.data.issueDate}
                        onChange={(e) =>
                          setActiveTemplate((p) => ({
                            ...p,
                            data: { ...p.data, issueDate: e.target.value },
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
                          setActiveTemplate((p) => ({
                            ...p,
                            data: { ...p.data, certificateId: e.target.value },
                          }))
                        }
                        className="w-full px-3 py-2 text-xs bg-surface-950 border border-surface-800 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TOOL TAB 3: SEALS & BADGES ────────────────────────────── */}
              {studioToolTab === 'badges' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-white block mb-1">
                      Embossed Seal / Medal Badge
                    </label>
                    <p className="text-[11px] text-surface-400 mb-3">
                      Add an official security seal or foil crest.
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'gold-star', label: '24K Gold Foil Star', desc: 'Embossed star & ribbons' },
                        { id: 'wax-seal', label: 'Red Notary Wax Seal', desc: 'Deep crimson stamped seal' },
                        { id: 'verified-shield', label: 'Security Shield', desc: 'Verified authentic padlock' },
                        { id: 'rosette', label: 'Honors Rosette', desc: 'Classical fabric rosette' },
                        { id: 'blue-ribbon', label: 'Excellence Ribbon', desc: 'Blue ribbon medal' },
                        { id: 'none', label: 'No Seal', desc: 'Clean minimalist center' },
                      ].map((b) => (
                        <button
                          key={b.id}
                          onClick={() =>
                            setActiveTemplate((p) => ({
                              ...p,
                              theme: { ...p.theme, badgeType: b.id as BadgeType },
                            }))
                          }
                          className={`p-2.5 rounded-xl border text-left transition-colors ${
                            activeTemplate.theme.badgeType === b.id
                              ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                              : 'border-surface-800 bg-surface-950 text-surface-400 hover:text-white'
                          }`}
                        >
                          <div className="text-xs font-bold text-white">{b.label}</div>
                          <div className="text-[10px] text-surface-500 leading-tight">{b.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Seal Upload */}
                  <div className="p-3.5 bg-surface-950 rounded-xl border border-surface-800">
                    <span className="text-xs font-bold text-white block mb-1">Upload Custom Seal / Stamp</span>
                    <span className="text-[10px] text-surface-400 block mb-3">
                      Upload your organization stamp, gold seal graphic, or notary crest (PNG recommended)
                    </span>
                    <input
                      type="file"
                      ref={badgeInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          handleFileUpload(f, (url) => {
                            setActiveTemplate((p) => ({
                              ...p,
                              theme: { ...p.theme, customBadgeUrl: url, badgeType: 'custom' },
                            }));
                          });
                        }
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => badgeInputRef.current?.click()}
                        className="btn-ghost text-xs py-1.5 px-3 border border-surface-700 hover:border-amber-500 flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>Upload Seal PNG</span>
                      </button>
                      {activeTemplate.theme.customBadgeUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveTemplate((p) => ({
                              ...p,
                              theme: { ...p.theme, customBadgeUrl: undefined, badgeType: 'gold-star' },
                            }))
                          }
                          className="btn-ghost text-xs p-1.5 text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Verification QR Code Toggle */}
                  <div className="flex items-center justify-between p-3 bg-surface-950 rounded-xl border border-surface-800">
                    <div className="flex items-center gap-2.5">
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-xs font-semibold text-white block">Verification QR Code</span>
                        <span className="text-[10px] text-surface-400 block">Digital authenticity validation stamp</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveTemplate((p) => ({
                          ...p,
                          theme: { ...p.theme, showQrCode: !p.theme.showQrCode },
                        }))
                      }
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        activeTemplate.theme.showQrCode ? 'bg-amber-500' : 'bg-surface-800'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          activeTemplate.theme.showQrCode ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── TOOL TAB 4: SIGNATURES ────────────────────────────────── */}
              {studioToolTab === 'signatures' && (
                <div className="space-y-5">
                  {/* Signer 1 */}
                  <div className="p-3.5 bg-surface-950 rounded-xl border border-surface-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Signer 1 (Left Authority)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Signer 1 Name"
                        value={activeTemplate.data.signer1Name}
                        onChange={(e) =>
                          setActiveTemplate((p) => ({
                            ...p,
                            data: { ...p.data, signer1Name: e.target.value },
                          }))
                        }
                        className="px-2.5 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-white focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="Signer 1 Title / Role"
                        value={activeTemplate.data.signer1Title}
                        onChange={(e) =>
                          setActiveTemplate((p) => ({
                            ...p,
                            data: { ...p.data, signer1Title: e.target.value },
                          }))
                        }
                        className="px-2.5 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-surface-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-surface-400 block mb-1">Signature Text / Script</span>
                      <input
                        type="text"
                        placeholder="Handwritten Signature text"
                        value={activeTemplate.data.signer1Sig}
                        onChange={(e) =>
                          setActiveTemplate((p) => ({
                            ...p,
                            data: { ...p.data, signer1Sig: e.target.value, signer1SigType: 'font' },
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-amber-300 font-serif italic focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Signer 2 Toggle & Fields */}
                  <div className="p-3.5 bg-surface-950 rounded-xl border border-surface-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Signer 2 (Right Authority)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveTemplate((p) => ({
                            ...p,
                            theme: { ...p.theme, showSigner2: !p.theme.showSigner2 },
                          }))
                        }
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          activeTemplate.theme.showSigner2
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-surface-800 text-surface-500'
                        }`}
                      >
                        {activeTemplate.theme.showSigner2 ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {activeTemplate.theme.showSigner2 && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Signer 2 Name"
                            value={activeTemplate.data.signer2Name}
                            onChange={(e) =>
                              setActiveTemplate((p) => ({
                                ...p,
                                data: { ...p.data, signer2Name: e.target.value },
                              }))
                            }
                            className="px-2.5 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-white focus:outline-none focus:border-amber-500"
                          />
                          <input
                            type="text"
                            placeholder="Signer 2 Title / Role"
                            value={activeTemplate.data.signer2Title}
                            onChange={(e) =>
                              setActiveTemplate((p) => ({
                                ...p,
                                data: { ...p.data, signer2Title: e.target.value },
                              }))
                            }
                            className="px-2.5 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-surface-300 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <span className="text-[10px] text-surface-400 block mb-1">Signature Text / Script</span>
                          <input
                            type="text"
                            placeholder="Handwritten Signature text"
                            value={activeTemplate.data.signer2Sig}
                            onChange={(e) =>
                              setActiveTemplate((p) => ({
                                ...p,
                                data: { ...p.data, signer2Sig: e.target.value, signer2SigType: 'font' },
                              }))
                            }
                            className="w-full px-2.5 py-1.5 text-xs bg-surface-900 border border-surface-700 rounded text-amber-300 font-serif italic focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TOOL TAB 5: COLORS & PALETTES ─────────────────────────── */}
              {studioToolTab === 'style' && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-bold text-white block mb-1.5">
                      Curated Color Themes
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { p: '#C59B27', s: '#0F2C59', bg: '#FDFBF7', name: 'Royal Gold & Navy' },
                        { p: '#059669', s: '#1E293B', bg: '#F8FAFC', name: 'Emerald Executive' },
                        { p: '#6366F1', s: '#312E81', bg: '#FAFAFA', name: 'Indigo Modern' },
                        { p: '#D4AF37', s: '#F8FAFC', bg: '#0F1117', name: 'Obsidian Night' },
                        { p: '#BE185D', s: '#831843', bg: '#FFFDFD', name: 'Rose Gold Luxury' },
                        { p: '#D97706', s: '#991B1B', bg: '#FFFBEB', name: 'Crimson Sports' },
                      ].map((c, i) => (
                        <button
                          key={i}
                          onClick={() =>
                            setActiveTemplate((p) => ({
                              ...p,
                              theme: {
                                ...p.theme,
                                primary: c.p,
                                secondary: c.s,
                                paperTint: c.bg,
                              },
                            }))
                          }
                          className="p-2 rounded-xl border border-surface-800 bg-surface-950 flex flex-col items-center gap-1.5 transition-transform hover:scale-105"
                        >
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full border border-surface-700" style={{ backgroundColor: c.p }} />
                            <div className="w-4 h-4 rounded-full border border-surface-700" style={{ backgroundColor: c.s }} />
                            <div className="w-4 h-4 rounded-full border border-surface-700" style={{ backgroundColor: c.bg }} />
                          </div>
                          <span className="text-[10px] text-surface-300 text-center truncate w-full">{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Hex Inputs */}
                  <div className="space-y-3 pt-2 border-t border-surface-800">
                    <div>
                      <label className="text-xs font-semibold text-surface-300 block mb-1">
                        Primary Accent & Border Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeTemplate.theme.primary}
                          onChange={(e) =>
                            setActiveTemplate((p) => ({
                              ...p,
                              theme: { ...p.theme, primary: e.target.value },
                            }))
                          }
                          className="w-8 h-8 rounded border border-surface-700 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={activeTemplate.theme.primary}
                          onChange={(e) =>
                            setActiveTemplate((p) => ({
                              ...p,
                              theme: { ...p.theme, primary: e.target.value },
                            }))
                          }
                          className="flex-1 px-3 py-1.5 text-xs bg-surface-950 border border-surface-800 rounded font-mono text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-surface-300 block mb-1">
                        Paper Tint (Canvas Background)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={activeTemplate.theme.paperTint}
                          onChange={(e) =>
                            setActiveTemplate((p) => ({
                              ...p,
                              theme: { ...p.theme, paperTint: e.target.value },
                            }))
                          }
                          className="w-8 h-8 rounded border border-surface-700 cursor-pointer bg-transparent"
                        />
                        <input
                          type="text"
                          value={activeTemplate.theme.paperTint}
                          onChange={(e) =>
                            setActiveTemplate((p) => ({
                              ...p,
                              theme: { ...p.theme, paperTint: e.target.value },
                            }))
                          }
                          className="flex-1 px-3 py-1.5 text-xs bg-surface-950 border border-surface-800 rounded font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Right Visual Certificate Canvas Viewport */}
          <main className="flex-1 bg-black/60 flex flex-col min-w-0">
            {/* Top Canvas Toolbar */}
            <div className="h-14 px-6 border-b border-surface-800 flex items-center justify-between bg-surface-900/60 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-white truncate max-w-xs">{activeTemplate.title}</span>
                <span className="text-surface-500">·</span>
                <span className="text-surface-400 capitalize">{activeTemplate.orientation}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPublishModal(true)}
                  className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 shadow-sm"
                  title="Publish to Community Marketplace or Save"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Publish / Save Template</span>
                </button>

                <button
                  onClick={handleDownloadImage}
                  disabled={isExporting}
                  className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-md shadow-primary-500/20"
                  title="Download High-Res 2x PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isExporting ? 'Exporting...' : 'Download Image (PNG)'}</span>
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

            {/* Certificate Display Area */}
            <div className="flex-1 overflow-auto p-4 sm:p-10 flex items-center justify-center">
              <div
                ref={certificateRef}
                className={`relative transition-all duration-300 shadow-2xl overflow-hidden m-auto select-none ${
                  activeTemplate.orientation === 'landscape'
                    ? 'w-[850px] h-[600px]'
                    : 'w-[600px] h-[850px]'
                }`}
                style={{
                  backgroundColor: activeTemplate.theme.paperTint,
                  color: textColor,
                }}
              >
                {/* ─── LAYER 1: SECURITY WATERMARK / TEXTURE ──────────── */}
                {activeTemplate.theme.watermarkType === 'guilloche' && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07]"
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    height="100%"
                  >
                    <defs>
                      <pattern id="guilloche-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
                        <circle cx="40" cy="40" r="36" fill="none" stroke={activeTemplate.theme.primary} strokeWidth="0.75" />
                        <circle cx="40" cy="40" r="28" fill="none" stroke={activeTemplate.theme.primary} strokeWidth="0.75" strokeDasharray="3 3" />
                        <circle cx="40" cy="40" r="20" fill="none" stroke={activeTemplate.theme.primary} strokeWidth="0.5" />
                        <path d="M0 40 Q20 20 40 40 T80 40" fill="none" stroke={activeTemplate.theme.primary} strokeWidth="0.5" />
                        <path d="M40 0 Q20 20 40 40 T40 80" fill="none" stroke={activeTemplate.theme.primary} strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#guilloche-pattern)" />
                  </svg>
                )}

                {/* ─── LAYER 2: AUTHENTIC DESIGNED BORDER ────────────── */}
                {/* Style A: Royal Guilloche */}
                {activeTemplate.theme.borderStyle === 'royal-guilloche' && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Outer thick rule */}
                    <div
                      className="absolute inset-3 border-4"
                      style={{ borderColor: activeTemplate.theme.primary }}
                    />
                    {/* Interwoven fine hairline */}
                    <div
                      className="absolute inset-5 border"
                      style={{ borderColor: `${activeTemplate.theme.primary}80` }}
                    />
                    <div
                      className="absolute inset-7 border-2 border-dashed"
                      style={{ borderColor: `${activeTemplate.theme.primary}60` }}
                    />

                    {/* Corner Ornaments */}
                    {activeTemplate.theme.cornerOrnaments && (
                      <>
                        <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4" style={{ borderColor: activeTemplate.theme.primary }}>
                          <div className="w-2 h-2 rounded-full m-1" style={{ backgroundColor: activeTemplate.theme.primary }} />
                        </div>
                        <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4" style={{ borderColor: activeTemplate.theme.primary }}>
                          <div className="w-2 h-2 rounded-full m-1 ml-auto" style={{ backgroundColor: activeTemplate.theme.primary }} />
                        </div>
                        <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4" style={{ borderColor: activeTemplate.theme.primary }}>
                          <div className="w-2 h-2 rounded-full m-1 mt-auto" style={{ backgroundColor: activeTemplate.theme.primary }} />
                        </div>
                        <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4" style={{ borderColor: activeTemplate.theme.primary }}>
                          <div className="w-2 h-2 rounded-full m-1 ml-auto mt-auto" style={{ backgroundColor: activeTemplate.theme.primary }} />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Style B: Vintage Gold Crest */}
                {activeTemplate.theme.borderStyle === 'vintage-crest' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-3.5 border-[3px]" style={{ borderColor: activeTemplate.theme.primary }} />
                    <div className="absolute inset-5 border" style={{ borderColor: `${activeTemplate.theme.primary}90` }} />
                    <div className="absolute inset-[26px] border border-dotted" style={{ borderColor: activeTemplate.theme.primary }} />

                    {activeTemplate.theme.cornerOrnaments && (
                      <>
                        <div className="absolute top-3 left-3 w-8 h-8 rounded-full border-2 flex items-center justify-center" style={{ borderColor: activeTemplate.theme.primary, backgroundColor: activeTemplate.theme.paperTint }}>
                          <Star className="w-4 h-4" style={{ color: activeTemplate.theme.primary }} />
                        </div>
                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full border-2 flex items-center justify-center" style={{ borderColor: activeTemplate.theme.primary, backgroundColor: activeTemplate.theme.paperTint }}>
                          <Star className="w-4 h-4" style={{ color: activeTemplate.theme.primary }} />
                        </div>
                        <div className="absolute bottom-3 left-3 w-8 h-8 rounded-full border-2 flex items-center justify-center" style={{ borderColor: activeTemplate.theme.primary, backgroundColor: activeTemplate.theme.paperTint }}>
                          <Star className="w-4 h-4" style={{ color: activeTemplate.theme.primary }} />
                        </div>
                        <div className="absolute bottom-3 right-3 w-8 h-8 rounded-full border-2 flex items-center justify-center" style={{ borderColor: activeTemplate.theme.primary, backgroundColor: activeTemplate.theme.paperTint }}>
                          <Star className="w-4 h-4" style={{ color: activeTemplate.theme.primary }} />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Style C: Modern Geometric */}
                {activeTemplate.theme.borderStyle === 'modern-geometric' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2" style={{ borderColor: activeTemplate.theme.primary }} />
                    {/* Geometric chamfer cuts */}
                    <div className="absolute top-2 left-2 w-10 h-10 border-t-2 border-l-2" style={{ borderColor: activeTemplate.theme.secondary }} />
                    <div className="absolute top-2 right-2 w-10 h-10 border-t-2 border-r-2" style={{ borderColor: activeTemplate.theme.secondary }} />
                    <div className="absolute bottom-2 left-2 w-10 h-10 border-b-2 border-l-2" style={{ borderColor: activeTemplate.theme.secondary }} />
                    <div className="absolute bottom-2 right-2 w-10 h-10 border-b-2 border-r-2" style={{ borderColor: activeTemplate.theme.secondary }} />
                  </div>
                )}

                {/* Style D: Diploma Classic */}
                {activeTemplate.theme.borderStyle === 'diploma-classic' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-3 border-4" style={{ borderColor: activeTemplate.theme.primary }} />
                    <div className="absolute inset-4 border" style={{ borderColor: activeTemplate.theme.secondary }} />
                    <div className="absolute inset-6 border" style={{ borderColor: `${activeTemplate.theme.primary}70` }} />
                  </div>
                )}

                {/* Style E: Botanical Filigree */}
                {activeTemplate.theme.borderStyle === 'botanical-filigree' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 rounded-lg" style={{ borderColor: activeTemplate.theme.primary }} />
                    <div className="absolute inset-6 border border-dashed rounded-md" style={{ borderColor: `${activeTemplate.theme.primary}80` }} />
                  </div>
                )}

                {/* Style F: Minimal Line */}
                {activeTemplate.theme.borderStyle === 'minimal-line' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-5 border" style={{ borderColor: activeTemplate.theme.primary }} />
                  </div>
                )}

                {/* ─── LAYER 3: CERTIFICATE CENTRAL CONTENT ──────────── */}
                <div className="relative z-10 w-full h-full flex flex-col justify-between p-12 text-center">
                  {/* Top: Logo, Organization & Certificate Title */}
                  <div>
                    {/* Logo / Crest */}
                    {activeTemplate.theme.logoType === 'custom' && activeTemplate.theme.customLogoUrl ? (
                      <img
                        src={activeTemplate.theme.customLogoUrl}
                        alt="Logo"
                        className="w-12 h-12 object-contain mx-auto mb-2"
                      />
                    ) : activeTemplate.theme.logoType === 'laurel' ? (
                      <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
                        <Award className="w-8 h-8" style={{ color: activeTemplate.theme.primary }} />
                      </div>
                    ) : activeTemplate.theme.logoType === 'shield' ? (
                      <div className="w-10 h-10 mx-auto mb-2 flex items-center justify-center">
                        <Shield className="w-8 h-8" style={{ color: activeTemplate.theme.primary }} />
                      </div>
                    ) : null}

                    {/* Organization Name */}
                    <div
                      className="text-xs font-bold uppercase tracking-[0.25em] mb-1.5 font-sans"
                      style={{ color: activeTemplate.theme.primary }}
                    >
                      {activeTemplate.data.organization}
                    </div>

                    {/* Certificate Title */}
                    <h2
                      className="text-2xl sm:text-3xl font-black uppercase tracking-wide my-1 font-serif"
                      style={{
                        color: isDarkMode ? activeTemplate.theme.primary : activeTemplate.theme.secondary,
                      }}
                    >
                      {activeTemplate.data.certificateTitle}
                    </h2>

                    <div
                      className="w-32 h-0.5 mx-auto my-2.5"
                      style={{ backgroundColor: activeTemplate.theme.primary }}
                    />

                    <p className="text-xs italic tracking-wider font-serif" style={{ color: subtextColor }}>
                      {activeTemplate.data.presentationText}
                    </p>
                  </div>

                  {/* Middle: Recipient & Citation */}
                  <div className="my-auto py-2">
                    <h3
                      className={`font-bold my-2 tracking-tight ${
                        activeTemplate.theme.recipientFontSize === 'xl'
                          ? 'text-4xl sm:text-5xl'
                          : activeTemplate.theme.recipientFontSize === 'lg'
                          ? 'text-3xl sm:text-4xl'
                          : activeTemplate.theme.recipientFontSize === 'md'
                          ? 'text-2xl sm:text-3xl'
                          : 'text-xl sm:text-2xl'
                      } ${
                        activeTemplate.theme.fontFamily === 'greatvibes' || activeTemplate.theme.fontFamily === 'script'
                          ? 'font-serif italic'
                          : activeTemplate.theme.fontFamily === 'gothic'
                          ? 'font-mono uppercase tracking-widest'
                          : activeTemplate.theme.fontFamily === 'modern'
                          ? 'font-sans font-black'
                          : 'font-serif'
                      }`}
                      style={{
                        color: isDarkMode ? '#FFFFFF' : activeTemplate.theme.secondary,
                      }}
                    >
                      {activeTemplate.data.recipientName}
                    </h3>

                    <div
                      className="w-48 h-0.5 mx-auto mb-3"
                      style={{ backgroundColor: `${activeTemplate.theme.primary}60` }}
                    />

                    <p
                      className="text-xs max-w-xl mx-auto leading-relaxed px-6"
                      style={{ color: subtextColor }}
                    >
                      {activeTemplate.data.description}
                    </p>

                    {activeTemplate.data.additionalDetails && (
                      <div
                        className="mt-2 text-[11px] font-semibold tracking-wider uppercase"
                        style={{ color: activeTemplate.theme.primary }}
                      >
                        {activeTemplate.data.additionalDetails}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Signatures, Seal, and Verification */}
                  <div className="flex items-end justify-between pt-4 border-t border-gray-200/30">
                    {/* Left: Signer 1 */}
                    <div className="text-center w-36">
                      <div
                        className="font-serif italic text-base border-b pb-1 mb-1"
                        style={{
                          borderColor: `${activeTemplate.theme.primary}60`,
                          color: isDarkMode ? '#FFFFFF' : activeTemplate.theme.secondary,
                        }}
                      >
                        {activeTemplate.data.signer1Sig || activeTemplate.data.signer1Name}
                      </div>
                      <div className="text-xs font-bold truncate">{activeTemplate.data.signer1Name}</div>
                      <div className="text-[10px] truncate" style={{ color: subtextColor }}>
                        {activeTemplate.data.signer1Title}
                      </div>
                    </div>

                    {/* Center: Seal & Verification */}
                    <div className="flex flex-col items-center justify-center">
                      {/* Seal / Badge Graphic */}
                      {activeTemplate.theme.badgeType === 'custom' && activeTemplate.theme.customBadgeUrl ? (
                        <img
                          src={activeTemplate.theme.customBadgeUrl}
                          alt="Custom Seal"
                          className="w-16 h-16 object-contain mb-1 shadow-lg"
                        />
                      ) : activeTemplate.theme.badgeType === 'gold-star' ? (
                        <div
                          className="w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center shadow-xl mb-1 relative"
                          style={{
                            borderColor: activeTemplate.theme.primary,
                            background: `radial-gradient(circle, ${activeTemplate.theme.primary}30 0%, ${activeTemplate.theme.primary}10 100%)`,
                          }}
                        >
                          <Star className="w-7 h-7" style={{ color: activeTemplate.theme.primary }} />
                          <span className="text-[7px] font-black uppercase tracking-tighter" style={{ color: activeTemplate.theme.primary }}>
                            OFFICIAL
                          </span>
                        </div>
                      ) : activeTemplate.theme.badgeType === 'wax-seal' ? (
                        <div className="w-15 h-15 rounded-full bg-red-700 border-2 border-red-900 text-amber-200 shadow-xl flex flex-col items-center justify-center mb-1 ring-2 ring-red-950">
                          <Stamp className="w-6 h-6 text-amber-300" />
                          <span className="text-[6px] font-bold tracking-widest uppercase">NOTARY</span>
                        </div>
                      ) : activeTemplate.theme.badgeType === 'verified-shield' ? (
                        <div
                          className="w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg mb-1"
                          style={{
                            borderColor: activeTemplate.theme.primary,
                            backgroundColor: `${activeTemplate.theme.primary}20`,
                          }}
                        >
                          <ShieldCheck className="w-7 h-7" style={{ color: activeTemplate.theme.primary }} />
                          <span className="text-[7px] font-bold" style={{ color: activeTemplate.theme.primary }}>
                            VERIFIED
                          </span>
                        </div>
                      ) : null}

                      <div className="text-[10px] font-mono font-medium" style={{ color: subtextColor }}>
                        {activeTemplate.data.issueDate}
                      </div>
                      <div className="text-[9px] font-mono" style={{ color: subtextColor }}>
                        ID: {activeTemplate.data.certificateId}
                      </div>
                    </div>

                    {/* Right: Signer 2 or Verification QR */}
                    <div className="text-center w-36">
                      {activeTemplate.theme.showSigner2 && activeTemplate.data.signer2Name ? (
                        <>
                          <div
                            className="font-serif italic text-base border-b pb-1 mb-1"
                            style={{
                              borderColor: `${activeTemplate.theme.primary}60`,
                              color: isDarkMode ? '#FFFFFF' : activeTemplate.theme.secondary,
                            }}
                          >
                            {activeTemplate.data.signer2Sig || activeTemplate.data.signer2Name}
                          </div>
                          <div className="text-xs font-bold truncate">{activeTemplate.data.signer2Name}</div>
                          <div className="text-[10px] truncate" style={{ color: subtextColor }}>
                            {activeTemplate.data.signer2Title}
                          </div>
                        </>
                      ) : activeTemplate.theme.showQrCode ? (
                        <div className="flex flex-col items-center justify-center">
                          <div className="p-1 rounded bg-white border shadow-sm">
                            <QrCode className="w-10 h-10 text-black" />
                          </div>
                          <span className="text-[8px] font-mono mt-0.5" style={{ color: subtextColor }}>
                            Scan to Verify
                          </span>
                        </div>
                      ) : null}
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
          {/* Create From Scratch Hero Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 border-2 border-dashed border-amber-500/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h2 className="text-base font-bold text-white">Create Custom Certificate from Scratch</h2>
              </div>
              <p className="text-xs text-surface-300 max-w-xl">
                Start with a clean blank canvas. Choose custom borders, security paper textures, wax seals, recipient typography, and multiple signers.
              </p>
            </div>
            <button
              onClick={handleStartFromScratch}
              className="btn-primary text-xs px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-extrabold shadow-lg shadow-amber-500/25 flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Blank Canvas Studio</span>
            </button>
          </div>

          {/* Filters Bar */}
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-black font-bold'
                      : 'bg-surface-900 border border-surface-800 text-surface-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Free vs Paid Filter */}
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
                    <div className="text-[9px] font-bold uppercase tracking-wider truncate" style={{ color: tmpl.theme.primary }}>
                      {tmpl.data.organization}
                    </div>
                    <div>
                      <div className="text-xs font-bold font-serif uppercase tracking-tight truncate">
                        {tmpl.data.certificateTitle}
                      </div>
                      <div className="text-[9px] text-gray-500 italic mt-0.5 truncate">
                        Awarded to {tmpl.data.recipientName}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[8px] text-gray-500 border-t border-gray-200/30 pt-1">
                      <span>{tmpl.data.issueDate}</span>
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span className="truncate max-w-[80px]">{tmpl.data.signer1Name}</span>
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

      {/* ─── TAB 3: MY TEMPLATES ─────────────────────────────────────────── */}
      {activeTab === 'my-templates' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-surface-800">
            <div>
              <h2 className="text-lg font-bold text-white">My Created & Published Templates</h2>
              <p className="text-xs text-surface-400">
                Templates you created from scratch or customized, saved, and published to the marketplace.
              </p>
            </div>
            <button
              onClick={handleStartFromScratch}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Create from Scratch
            </button>
          </div>

          {userTemplates.length === 0 ? (
            <div className="card text-center p-12 border-surface-800 max-w-md mx-auto my-12">
              <Award className="w-12 h-12 text-surface-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-white mb-1">No Custom Templates Yet</h3>
              <p className="text-xs text-surface-400 mb-5">
                Design a certificate from scratch in the Studio Editor and click "Publish / Save Template" to save it here!
              </p>
              <button
                onClick={handleStartFromScratch}
                className="btn-primary text-xs px-4 py-2 mx-auto"
              >
                Start Designing Now
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
                Publish / Save Certificate Template
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
                placeholder="e.g. Vintage Academic Gold Award"
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
                    Saved only to your private library
                  </span>
                </button>
              </div>
            </div>

            {/* Free vs Paid Pricing */}
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
