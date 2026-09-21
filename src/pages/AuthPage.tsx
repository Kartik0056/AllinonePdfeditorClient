/**
 * Auth Page - Login/Register
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, ChevronLeft, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import Navbar from '../components/Navbar';
import { authAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let response;
      if (isLogin) {
        response = await authAPI.login({ email, password });
      } else {
        response = await authAPI.register({ name, email, password });
      }

      const { token, user } = response.data.data;
      setAuth(user, token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface-950 flex flex-col">
      <Navbar />

      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-surface-400 hover:text-white mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>

        <div className="card p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="text-surface-400 text-sm mt-1">
              {isLogin ? 'Sign in to access your projects' : 'Start editing PDFs today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-xs text-surface-500 block mb-1.5">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                  <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Your name" className="input pl-10" required />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs text-surface-500 block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="input pl-10" required />
              </div>
            </div>

            <div>
              <label className="text-xs text-surface-500 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
                <input
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                  required minLength={6}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>}

            <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-surface-400 hover:text-primary-400 transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
