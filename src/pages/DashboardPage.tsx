/**
 * User Dashboard Page
 * Features:
 * 1. Overview & Saved Projects
 * 2. Edit Profile & Avatar upload
 * 3. Payment Details & Payouts (UPI, Bank Account, Cards)
 * 4. Password & Security Management
 */

import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Trash2,
  Clock,
  FolderOpen,
  Loader2,
  User,
  CreditCard,
  Key,
  ShieldCheck,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Building2,
  Sparkles,
  Award,
  ExternalLink,
  Wallet,
  ArrowRight,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuthStore, PaymentDetails } from '../stores/authStore';
import { projectAPI, authAPI } from '../services/api';

interface Project {
  _id: string;
  name: string;
  originalFileName: string;
  fileSize: number;
  pageCount: number;
  updatedAt: string;
}

type TabType = 'overview' | 'profile' | 'payments' | 'security';

export default function DashboardPage() {
  const { user, isAuthenticated, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab
  const activeTabParam = (searchParams.get('tab') as TabType) || 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(
    ['overview', 'profile', 'payments', 'security'].includes(activeTabParam) ? activeTabParam : 'overview'
  );

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && ['overview', 'profile', 'payments', 'security'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // ─── Projects State ─────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // ─── Profile Form State ─────────────────────────────────────
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileBio, setProfileBio] = useState(user?.bio || '');
  const [profileCompany, setProfileCompany] = useState(user?.company || '');
  const [profileAvatar, setProfileAvatar] = useState(user?.avatar || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Payment Details State ──────────────────────────────────
  const [upiId, setUpiId] = useState(user?.paymentDetails?.upiId || '');
  const [bankName, setBankName] = useState(user?.paymentDetails?.bankName || '');
  const [accountNumber, setAccountNumber] = useState(user?.paymentDetails?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(user?.paymentDetails?.ifscCode || '');
  const [accountHolder, setAccountHolder] = useState(user?.paymentDetails?.accountHolder || '');
  const [cardHolder, setCardHolder] = useState(user?.paymentDetails?.cardHolder || '');
  const [cardLast4, setCardLast4] = useState(user?.paymentDetails?.cardLast4 || '');
  const [cardExpiry, setCardExpiry] = useState(user?.paymentDetails?.cardExpiry || '');
  const [isSavingPayments, setIsSavingPayments] = useState(false);
  const [paymentsSuccessMsg, setPaymentsSuccessMsg] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  // ─── Password State ─────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [pwSuccessMsg, setPwSuccessMsg] = useState('');
  const [pwErrorMsg, setPwErrorMsg] = useState('');

  // Protect route
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    loadProjects();
    fetchFreshUserData();
  }, [isAuthenticated]);

  // Sync user state to form fields when user object changes
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileBio(user.bio || '');
      setProfileCompany(user.company || '');
      setProfileAvatar(user.avatar || '');

      if (user.paymentDetails) {
        setUpiId(user.paymentDetails.upiId || '');
        setBankName(user.paymentDetails.bankName || '');
        setAccountNumber(user.paymentDetails.accountNumber || '');
        setIfscCode(user.paymentDetails.ifscCode || '');
        setAccountHolder(user.paymentDetails.accountHolder || '');
        setCardHolder(user.paymentDetails.cardHolder || '');
        setCardLast4(user.paymentDetails.cardLast4 || '');
        setCardExpiry(user.paymentDetails.cardExpiry || '');
      }
    }
  }, [user]);

  const fetchFreshUserData = async () => {
    try {
      const res = await authAPI.me();
      if (res.data?.success && res.data?.data) {
        updateUser(res.data.data);
      }
    } catch {
      // Keep cached state
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectAPI.list();
      setProjects(response.data.data || []);
    } catch {
      // Offline/demo fallback
    }
    setIsLoadingProjects(false);
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectAPI.delete(id);
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch {}
  };

  // Avatar Upload & client resize
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, or WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setProfileAvatar(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Remove Avatar
  const handleRemoveAvatar = () => {
    setProfileAvatar('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      const res = await authAPI.updateProfile({
        name: profileName,
        phone: profilePhone,
        bio: profileBio,
        company: profileCompany,
        avatar: profileAvatar,
      });

      if (res.data?.success) {
        updateUser(res.data.data);
        setProfileSuccessMsg('Profile updated successfully!');
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      } else {
        setProfileErrorMsg(res.data?.error || 'Failed to update profile');
      }
    } catch (err: any) {
      setProfileErrorMsg(err.response?.data?.error || 'Failed to update profile');
    }
    setIsSavingProfile(false);
  };

  // Save Payment Details
  const handleSavePayments = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPayments(true);
    setPaymentsSuccessMsg('');

    const paymentDetails: PaymentDetails = {
      upiId: upiId.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      accountHolder: accountHolder.trim(),
      cardHolder: cardHolder.trim(),
      cardLast4: cardLast4.trim(),
      cardExpiry: cardExpiry.trim(),
    };

    try {
      const res = await authAPI.updateProfile({ paymentDetails });
      if (res.data?.success) {
        updateUser({ paymentDetails });
        setPaymentsSuccessMsg('Payment details saved successfully!');
        setTimeout(() => setPaymentsSuccessMsg(''), 4000);
      }
    } catch {
      alert('Failed to save payment details. Please try again.');
    }
    setIsSavingPayments(false);
  };

  // Copy UPI ID
  const handleCopyUpi = () => {
    if (!upiId) return;
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSuccessMsg('');
    setPwErrorMsg('');

    if (newPassword.length < 6) {
      setPwErrorMsg('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwErrorMsg('New passwords do not match');
      return;
    }

    setIsChangingPw(true);
    try {
      const res = await authAPI.changePassword({ currentPassword, newPassword });
      if (res.data?.success) {
        setPwSuccessMsg('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPwSuccessMsg(''), 5000);
      } else {
        setPwErrorMsg(res.data?.error || 'Failed to change password');
      }
    } catch (err: any) {
      setPwErrorMsg(err.response?.data?.error || 'Current password incorrect or change failed');
    }
    setIsChangingPw(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const totalStorage = projects.reduce((acc, p) => acc + (p.fileSize || 0), 0);
  const userInitial = (user?.name?.trim()?.[0] || 'U').toUpperCase();

  return (
    <div className="min-h-screen bg-surface-950 text-surface-100 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-900 via-surface-900/90 to-surface-900 border border-surface-800 p-6 sm:p-8 mb-8 shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="relative group">
                {profileAvatar ? (
                  <img
                    src={profileAvatar}
                    alt={user?.name || 'Avatar'}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-primary-500/30 shadow-lg shadow-primary-500/20"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 via-purple-600 to-indigo-700 text-white font-black text-3xl flex items-center justify-center shadow-xl ring-4 ring-surface-800">
                    {userInitial}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => switchTab('profile')}
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-md transition-transform hover:scale-110"
                  title="Change Avatar"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-white tracking-tight">{user?.name || 'Account User'}</h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 text-white font-bold tracking-wide shadow-sm">
                    PRO
                  </span>
                </div>
                <p className="text-surface-400 text-sm mt-0.5">{user?.email}</p>
                <div className="flex items-center gap-3 mt-2.5 text-xs text-surface-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified Member
                  </span>
                  {user?.company && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-surface-400" />
                      {user.company}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto">
              <Link to="/editor" className="btn-primary flex items-center justify-center gap-2 text-xs py-2 px-4 shadow-lg shadow-primary-500/20 flex-1 sm:flex-initial">
                <Plus className="w-4 h-4" />
                <span>New PDF Project</span>
              </Link>
              <Link to="/certificate" className="btn-ghost flex items-center justify-center gap-2 text-xs py-2 px-3.5 border border-surface-700 flex-1 sm:flex-initial">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Certificate Studio</span>
              </Link>
            </div>
          </div>

          {/* Tab Navigation Navigation Bar */}
          <div className="relative z-10 flex items-center gap-2 mt-8 pt-4 border-t border-surface-800/80 overflow-x-auto scrollbar-none">
            <button
              onClick={() => switchTab('overview')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'overview'
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Overview & Projects</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'overview' ? 'bg-white/20 text-white' : 'bg-surface-800 text-surface-400'}`}>
                {projects.length}
              </span>
            </button>

            <button
              onClick={() => switchTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'profile'
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Edit Profile & Avatar</span>
            </button>

            <button
              onClick={() => switchTab('payments')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'payments'
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Payment & Payouts</span>
            </button>

            <button
              onClick={() => switchTab('security')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'security'
                  ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                  : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Password & Security</span>
            </button>
          </div>
        </div>

        {/* ─── TAB 1: OVERVIEW & PROJECTS ──────────────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-surface-400 text-xs">
                  <span>Saved Projects</span>
                  <FileText className="w-4 h-4 text-primary-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">{projects.length}</div>
                <div className="text-[11px] text-surface-500 mt-1">Ready to edit anytime</div>
              </div>

              <div className="card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-surface-400 text-xs">
                  <span>Cloud Storage</span>
                  <FolderOpen className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl font-bold text-white mt-2">{formatSize(totalStorage)}</div>
                <div className="text-[11px] text-surface-500 mt-1">Unlimited Pro cloud space</div>
              </div>

              <div className="card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-surface-400 text-xs">
                  <span>Payout Method</span>
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-base font-bold text-emerald-400 mt-2 truncate">
                  {user?.paymentDetails?.upiId ? 'UPI Connected' : user?.paymentDetails?.bankName ? 'Bank Linked' : 'Not Configured'}
                </div>
                <button
                  onClick={() => switchTab('payments')}
                  className="text-[11px] text-primary-400 hover:underline mt-1 text-left"
                >
                  Manage Payouts →
                </button>
              </div>

              <div className="card p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-surface-400 text-xs">
                  <span>Certificate Store</span>
                  <Award className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-2">Active</div>
                <Link to="/certificate" className="text-[11px] text-amber-400 hover:underline mt-1">
                  Design Templates →
                </Link>
              </div>
            </div>

            {/* Projects List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Recent PDF Projects</h2>
                <Link to="/editor" className="text-xs text-primary-400 hover:text-primary-300 font-semibold flex items-center gap-1">
                  Create New <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {isLoadingProjects ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
                </div>
              ) : projects.length === 0 ? (
                <div className="card p-14 text-center">
                  <FolderOpen className="w-14 h-14 text-surface-700 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-surface-200 mb-1">No saved projects yet</h3>
                  <p className="text-surface-500 text-xs mb-5 max-w-sm mx-auto">
                    Open the PDF Editor or Certificate Studio to create, edit and save your documents to the cloud.
                  </p>
                  <Link to="/editor" className="btn-primary inline-flex items-center gap-2 text-xs px-4 py-2">
                    <Plus className="w-4 h-4" /> Open Editor
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => (
                    <div key={project._id} className="card-hover group flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 text-red-400" />
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleDeleteProject(project._id);
                            }}
                            className="btn-icon p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-surface-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                            title="Delete Project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <h3 className="text-sm font-semibold text-white truncate mb-1">{project.name}</h3>
                        <p className="text-xs text-surface-400 truncate mb-3">{project.originalFileName}</p>
                      </div>

                      <div className="pt-3 border-t border-surface-800 flex items-center justify-between text-xs text-surface-500">
                        <span>{project.pageCount} pages · {formatSize(project.fileSize)}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(project.updatedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: EDIT PROFILE & AVATAR ────────────────────── */}
        {activeTab === 'profile' && (
          <div className="card p-6 sm:p-8 max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Profile Information</h2>
              <p className="text-xs text-surface-400 mt-0.5">
                Update your personal information, organization details, and avatar image.
              </p>
            </div>

            {profileSuccessMsg && (
              <div className="mb-6 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="mb-6 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Avatar Section */}
              <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative shrink-0">
                  {profileAvatar ? (
                    <img
                      src={profileAvatar}
                      alt="Avatar Preview"
                      className="w-20 h-20 rounded-2xl object-cover ring-2 ring-primary-500 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 text-white font-black text-2xl flex items-center justify-center">
                      {userInitial}
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="text-xs font-semibold text-white mb-1">Profile Photo</div>
                  <div className="text-[11px] text-surface-400 mb-3">
                    Upload a square PNG, JPG, or WEBP image. Max 320x320 px recommended.
                  </div>

                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarSelect}
                      accept="image/*"
                      className="hidden"
                      id="avatar-upload"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-ghost text-xs px-3 py-1.5 border border-surface-700 hover:border-primary-500 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-primary-400" />
                      <span>Upload New</span>
                    </button>

                    {profileAvatar && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="btn-ghost text-xs px-2.5 py-1.5 text-red-400 hover:bg-red-500/10 flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="input w-full text-xs"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="input w-full text-xs bg-surface-900/60 text-surface-400 cursor-not-allowed border-surface-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="input w-full text-xs"
                    placeholder="e.g. +91 9876543210"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-1.5">
                    Company / Organization
                  </label>
                  <input
                    type="text"
                    value={profileCompany}
                    onChange={(e) => setProfileCompany(e.target.value)}
                    className="input w-full text-xs"
                    placeholder="e.g. Acme Inc. or Freelance"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-300 mb-1.5">
                  About Me / Bio
                </label>
                <textarea
                  rows={3}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  className="input w-full text-xs"
                  placeholder="Tell clients or collaborators a little about yourself and your work..."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 font-semibold shadow-md shadow-primary-500/20"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Profile Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB 3: PAYMENT DETAILS & PAYOUTS ────────────────── */}
        {activeTab === 'payments' && (
          <div className="card p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Payment & Payout Methods</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  SECURE
                </span>
              </div>
              <p className="text-xs text-surface-400 mt-0.5">
                Add your UPI ID and Bank Account to receive direct payouts when selling Certificate templates or services.
              </p>
            </div>

            {paymentsSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{paymentsSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePayments} className="space-y-6">
              {/* Method 1: UPI ID */}
              <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white">Instant UPI Payouts</span>
                      <span className="text-[10px] text-emerald-400 block font-semibold">Recommended for India</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-surface-400">GPay, PhonePe, Paytm, BHIM</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-surface-300 mb-1.5">
                    UPI ID (Virtual Payment Address)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourname@okhdfcbank or 9876543210@paytm"
                      className="input w-full text-xs pr-10"
                    />
                    {upiId && (
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="absolute right-2 text-surface-400 hover:text-white p-1 rounded"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Method 2: Bank Account Details */}
              <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary-500/20 text-primary-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">Direct Bank Account Transfer</span>
                    <span className="text-[10px] text-surface-400 block">For NEFT / RTGS / IMPS wire transfers</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={accountHolder}
                      onChange={(e) => setAccountHolder(e.target.value)}
                      placeholder="As per bank passbook"
                      className="input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, SBI, ICICI"
                      className="input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 5010023456789"
                      className="input w-full text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      IFSC / SWIFT Code
                    </label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      className="input w-full text-xs uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Method 3: Card Details (Optional) */}
              <div className="p-4 rounded-xl bg-surface-900 border border-surface-800 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white">Debit / Credit Card (Optional)</span>
                    <span className="text-[10px] text-surface-400 block">Saved reference for billing or verification</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Name on Card
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="Cardholder Name"
                      className="input w-full text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Last 4 Digits
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                      placeholder="•••• 4242"
                      className="input w-full text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-surface-300 mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="12/28"
                      className="input w-full text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingPayments}
                  className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 font-semibold shadow-md shadow-primary-500/20"
                >
                  {isSavingPayments ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Payment Details...</span>
                    </>
                  ) : (
                    <span>Save Payment Details</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ─── TAB 4: PASSWORD & SECURITY ──────────────────────── */}
        {activeTab === 'security' && (
          <div className="card p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Password & Security Settings</h2>
              <p className="text-xs text-surface-400 mt-0.5">
                Ensure your account is protected with a strong, distinct password.
              </p>
            </div>

            {pwSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pwSuccessMsg}</span>
              </div>
            )}

            {pwErrorMsg && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pwErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-surface-300 mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input w-full text-xs pr-10"
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                  >
                    {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-300 mb-1.5">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input w-full text-xs pr-10"
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-white"
                  >
                    {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-300 mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input w-full text-xs"
                  placeholder="Re-enter your new password"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPw}
                  className="btn-primary text-xs px-5 py-2.5 flex items-center gap-2 font-semibold shadow-md shadow-primary-500/20"
                >
                  {isChangingPw ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-surface-800 space-y-3">
              <div className="text-xs font-bold text-surface-200">Active Security Overview</div>
              <div className="p-3 bg-surface-900 rounded-xl border border-surface-800 flex items-center justify-between text-xs text-surface-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Two-Factor Authentication (2FA) Readiness</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface-800 text-surface-300">
                  Standard Password Auth
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
