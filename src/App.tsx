/**
 * App - Root component with routing and ErrorBoundary
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import WaterRippleCursor from './components/WaterRippleCursor';

// Lazy-loaded pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const EditorPage = lazy(() => import('./pages/EditorPage'));
const MergePage = lazy(() => import('./pages/MergePage'));
const SplitPage = lazy(() => import('./pages/SplitPage'));
const ConvertPage = lazy(() => import('./pages/ConvertPage'));
const CompressPage = lazy(() => import('./pages/CompressPage'));
const ImageEditorPage = lazy(() => import('./pages/ImageEditorPage'));
const VideoEditorPage = lazy(() => import('./pages/VideoEditorPage'));
const PassportPhotoPage = lazy(() => import('./pages/PassportPhotoPage'));
const CertificatePage = lazy(() => import('./pages/CertificatePage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
        <p className="text-surface-400 text-sm">Loading Studio...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <WaterRippleCursor />
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/certificate" element={<CertificatePage />} />
            <Route path="/merge" element={<MergePage />} />
            <Route path="/split" element={<SplitPage />} />
            <Route path="/convert" element={<ConvertPage />} />
            <Route path="/compress" element={<CompressPage />} />
            <Route path="/image-editor" element={<ImageEditorPage />} />
            <Route path="/video-editor" element={<VideoEditorPage />} />
            <Route path="/passport-photo" element={<PassportPhotoPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
