/**
 * Persistent Global Navbar
 * Clean, modern layout with primary tools, More Tools dropdown, and user profile management.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  Merge,
  Scissors,
  Image,
  Shrink,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  User,
  Sparkles,
  Film,
  Camera,
  Award,
  ChevronDown,
  CreditCard,
  Key,
  ShieldCheck,
  Settings,
  FolderOpen,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const primaryNavItems = [
  { path: '/editor', label: 'PDF Editor', icon: FileText, desc: 'Edit text, draw & PDFs' },
  { path: '/certificate', label: 'Certificate', icon: Award, desc: 'Design & marketplace', badge: 'NEW' },
  { path: '/passport-photo', label: 'Passport Photo', icon: Camera, desc: 'Passport size & A4 print' },
  { path: '/merge', label: 'Merge', icon: Merge, desc: 'Combine multiple PDFs' },
];

export const moreTools = [
  { path: '/split', label: 'Split PDF', icon: Scissors, desc: 'Split & extract pages' },
  { path: '/convert', label: 'Convert & OCR', icon: Sparkles, desc: 'PDF to Image & BG Remover' },
  { path: '/compress', label: 'Compress PDF', icon: Shrink, desc: 'Reduce PDF file size' },
  { path: '/image-editor', label: 'Image Studio', icon: Image, desc: 'Crop, filter & photo editor' },
  { path: '/video-editor', label: 'Video Studio', icon: Film, desc: 'Timeline video editor' },
];

export const allNavItems = [...primaryNavItems, ...moreTools];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toolsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on route change
  useEffect(() => {
    setToolsDropdownOpen(false);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(event.target as Node)) {
        setToolsDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path: string) => {
    if (path === '/editor') {
      return location.pathname.startsWith('/editor');
    }
    return location.pathname === path;
  };

  const isMoreToolActive = moreTools.some((tool) => isActive(tool.path));

  const handleLogout = () => {
    logout();
    navigate('/');
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  };

  const userInitial = (user?.name?.trim()?.[0] || 'U').toUpperCase();

  return (
    <header className="sticky top-0 left-0 right-0 z-50 glass border-b border-surface-800/60 backdrop-blur-xl bg-surface-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 via-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:scale-105 transition-transform duration-200">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-extrabold text-white tracking-tight">
                PDF<span className="text-primary-400">Studio</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-500/20 text-primary-300 font-mono font-semibold border border-primary-500/30 hidden sm:inline-block">
                PRO
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Primary Tool Links + More Dropdown */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {primaryNavItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  active
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/35 shadow-sm shadow-primary-500/10'
                    : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-primary-400' : 'text-surface-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* More Tools Dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isMoreToolActive || toolsDropdownOpen
                  ? 'bg-surface-800 text-white border border-surface-700 shadow-sm'
                  : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
              }`}
            >
              <span>More Tools</span>
              <ChevronDown
                className={`w-3 h-3 text-surface-400 transition-transform duration-200 ${
                  toolsDropdownOpen ? 'rotate-180 text-primary-400' : ''
                }`}
              />
            </button>

            {toolsDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 p-2 bg-surface-900/95 backdrop-blur-2xl rounded-xl border border-surface-700/80 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="text-[11px] font-semibold text-surface-400 px-3 py-1.5 uppercase tracking-wider">
                  Additional Tools
                </div>
                <div className="space-y-1">
                  {moreTools.map((tool) => {
                    const active = isActive(tool.path);
                    const Icon = tool.icon;
                    return (
                      <Link
                        key={tool.path}
                        to={tool.path}
                        onClick={() => setToolsDropdownOpen(false)}
                        className={`flex items-start gap-3 p-2.5 rounded-lg transition-all ${
                          active
                            ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                            : 'hover:bg-surface-800/70 text-surface-200'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            active ? 'bg-primary-500 text-white' : 'bg-surface-800 text-surface-400'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{tool.label}</div>
                          <div className="text-[11px] text-surface-400 truncate">{tool.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Medium Screen Compact Navigation (Tablets) */}
        <nav className="hidden md:flex lg:hidden items-center gap-1">
          <Link
            to="/editor"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              isActive('/editor') ? 'bg-primary-500/20 text-primary-300' : 'text-surface-300 hover:text-white'
            }`}
          >
            Editor
          </Link>
          <Link
            to="/certificate"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              isActive('/certificate') ? 'bg-primary-500/20 text-primary-300' : 'text-surface-300 hover:text-white'
            }`}
          >
            Certificate
          </Link>
          <Link
            to="/passport-photo"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
              isActive('/passport-photo') ? 'bg-primary-500/20 text-primary-300' : 'text-surface-300 hover:text-white'
            }`}
          >
            Passport Photo
          </Link>
        </nav>

        {/* Right side: Auth & User Menu */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`flex items-center gap-2 p-1.5 pr-2.5 rounded-xl transition-all duration-150 border ${
                  userMenuOpen
                    ? 'bg-surface-800 border-surface-600 shadow-md ring-2 ring-primary-500/30'
                    : 'bg-surface-900/60 hover:bg-surface-800/80 border-surface-800 hover:border-surface-700'
                }`}
              >
                {/* User Avatar */}
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-primary-500/40"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-inner">
                    {userInitial}
                  </div>
                )}

                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-white max-w-[110px] truncate leading-tight">
                    {user?.name || 'Account'}
                  </div>
                  <div className="text-[10px] text-primary-400 font-medium">Dashboard</div>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-surface-400 transition-transform duration-200 ${
                    userMenuOpen ? 'rotate-180 text-primary-400' : ''
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 p-2 bg-surface-900/98 backdrop-blur-2xl rounded-2xl border border-surface-700 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* User Profile Card */}
                  <div className="p-3 bg-surface-800/60 rounded-xl border border-surface-700/50 flex items-center gap-3 mb-2">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || 'User'}
                        className="w-11 h-11 rounded-xl object-cover ring-2 ring-primary-500/40 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 text-white font-bold text-base flex items-center justify-center shrink-0 shadow-md">
                        {userInitial}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white truncate">{user?.name || 'User'}</div>
                      <div className="text-xs text-surface-400 truncate">{user?.email}</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        Active Account
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Quick Navigation Links */}
                  <div className="space-y-1">
                    <Link
                      to="/dashboard?tab=overview"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-surface-200 hover:text-white hover:bg-surface-800/80 transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-primary-400 shrink-0" />
                      <span>My Projects & Files</span>
                    </Link>

                    <Link
                      to="/dashboard?tab=profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-surface-200 hover:text-white hover:bg-surface-800/80 transition-colors"
                    >
                      <User className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Edit Profile & Avatar</span>
                    </Link>

                    <Link
                      to="/dashboard?tab=payments"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-surface-200 hover:text-white hover:bg-surface-800/80 transition-colors"
                    >
                      <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Payment & Payouts</span>
                    </Link>

                    <Link
                      to="/dashboard?tab=security"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-surface-200 hover:text-white hover:bg-surface-800/80 transition-colors"
                    >
                      <Key className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Password & Security</span>
                    </Link>
                  </div>

                  <div className="my-2 border-t border-surface-800" />

                  {/* Logout Action */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth"
                className="px-3 py-1.5 text-xs font-medium text-surface-300 hover:text-white rounded-lg hover:bg-surface-800/60 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/editor"
                className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-md shadow-primary-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Open Editor
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn-icon p-2 bg-surface-900/80 border border-surface-800 rounded-lg text-surface-200"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-800/90 bg-surface-950/98 backdrop-blur-2xl px-4 py-4 space-y-4 max-h-[85vh] overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-200">
          {/* User Account Info on Mobile */}
          {isAuthenticated ? (
            <div className="p-3 bg-surface-900 rounded-xl border border-surface-800">
              <div className="flex items-center gap-3 mb-3">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || 'User'}
                    className="w-10 h-10 rounded-xl object-cover ring-1 ring-primary-500/40"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center">
                    {userInitial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-white truncate">{user?.name || 'User'}</div>
                  <div className="text-xs text-surface-400 truncate">{user?.email}</div>
                </div>
              </div>

              {/* Mobile Dashboard Links */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-800">
                <Link
                  to="/dashboard?tab=overview"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-surface-200 bg-surface-800/60"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-primary-400" />
                  <span>Projects</span>
                </Link>
                <Link
                  to="/dashboard?tab=profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-surface-200 bg-surface-800/60"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Profile</span>
                </Link>
                <Link
                  to="/dashboard?tab=payments"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-surface-200 bg-surface-800/60"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Payments</span>
                </Link>
                <Link
                  to="/dashboard?tab=security"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs font-medium text-surface-200 bg-surface-800/60"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Security</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 text-center text-xs font-semibold rounded-lg bg-surface-800 text-white"
              >
                Sign In
              </Link>
              <Link
                to="/editor"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-2 text-center text-xs font-semibold rounded-lg btn-primary"
              >
                Open Editor
              </Link>
            </div>
          )}

          {/* All Tool Links */}
          <div>
            <div className="text-[11px] font-semibold text-surface-400 uppercase tracking-wider mb-2">
              PDF & Creation Tools
            </div>
            <div className="grid grid-cols-2 gap-2">
              {allNavItems.map((item) => {
                const active = isActive(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs font-medium transition-colors ${
                      active
                        ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                        : 'bg-surface-900/60 text-surface-300 hover:text-white hover:bg-surface-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-primary-400 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Logout if authenticated */}
          {isAuthenticated && (
            <div className="pt-2 border-t border-surface-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
