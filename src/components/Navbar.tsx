/**
 * Persistent Global Navbar
 * Displayed across all pages and tools so navigation is always accessible.
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export const navItems = [
  { path: '/editor', label: 'PDF Editor', icon: FileText, desc: 'Edit text & PDFs' },
  { path: '/certificate', label: 'Certificate', icon: Award, desc: 'Design & templates' },
  { path: '/passport-photo', label: 'Passport Photo', icon: Camera, desc: 'Passport size & A4 print' },
  { path: '/merge', label: 'Merge', icon: Merge, desc: 'Combine PDFs' },
  { path: '/split', label: 'Split', icon: Scissors, desc: 'Split & extract' },
  { path: '/convert', label: 'Convert', icon: Sparkles, desc: 'PDF to Image & BG Remover' },
  { path: '/compress', label: 'Compress', icon: Shrink, desc: 'Reduce PDF size' },
  { path: '/image-editor', label: 'Image Studio', icon: Image, desc: 'Pro photo editor' },
  { path: '/video-editor', label: 'Video Studio', icon: Film, desc: 'Timeline video editor' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/editor') {
      return location.pathname.startsWith('/editor');
    }
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-50 glass border-b border-surface-800/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform duration-200">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              PDF Studio
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-300 font-mono hidden sm:inline-block">
                PRO
              </span>
            </span>
          </div>
        </Link>

        {/* Desktop Tool Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  active
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 shadow-sm shadow-primary-500/10'
                    : 'text-surface-300 hover:text-white hover:bg-surface-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-primary-400' : 'text-surface-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side: Auth & Actions */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Link
                to="/dashboard"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'bg-surface-800 text-white border border-surface-700'
                    : 'text-surface-300 hover:text-white hover:bg-surface-800/50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-primary-400" />
                <span>Projects</span>
              </Link>

              <div className="flex items-center gap-1.5 pl-2 border-l border-surface-800">
                <span className="text-xs text-surface-400 max-w-[100px] truncate" title={user?.name || ''}>
                  {user?.name || 'User'}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-ghost p-1 text-surface-400 hover:text-red-400"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/auth"
                className="px-3 py-1.5 text-xs text-surface-300 hover:text-white rounded-lg hover:bg-surface-800/60 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/editor"
                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5 shadow-md"
              >
                <Sparkles className="w-3 h-3" />
                Open Editor
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn-icon p-1.5"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-800/80 bg-surface-950/95 backdrop-blur-xl px-4 py-3 space-y-2 animate-fade-in">
          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                    active
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                      : 'text-surface-300 hover:text-white hover:bg-surface-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-primary-400 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-surface-800/80 flex items-center justify-between">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-1.5 text-xs text-surface-300 hover:text-white"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-primary-400" />
                  <span>My Projects</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-xs text-surface-400 hover:text-red-400 flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <Link
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-surface-300 hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  to="/editor"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Open Editor
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
