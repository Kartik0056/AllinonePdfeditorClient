/**
 * API Service - Axios instance with JWT interceptor
 */

import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '' : 'https://allinonepdfeditorserver.onrender.com');

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 120000, // 2 minutes for large file operations
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;

/**
 * Get absolute file URL from a relative or absolute backend path
 */
export const getFileUrl = (filePath: string): string => {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Download a file cleanly using a local Blob URL or backend fallback
 * Ensures cross-origin downloads work and custom filename is preserved
 */
export const downloadFile = async (filePath: string, customFilename?: string): Promise<void> => {
  if (!filePath) return;
  const fullUrl = getFileUrl(filePath);

  let fileName = (customFilename || '').trim();
  if (!fileName) {
    fileName = filePath.split('/').pop() || 'downloaded_document.pdf';
  }

  // Ensure PDF extension if appropriate
  const isPdf = filePath.toLowerCase().includes('.pdf') || fullUrl.toLowerCase().includes('.pdf');
  const isZip = filePath.toLowerCase().includes('.zip') || fullUrl.toLowerCase().includes('.zip');
  if (isPdf && !fileName.toLowerCase().endsWith('.pdf')) {
    fileName = `${fileName}.pdf`;
  } else if (isZip && !fileName.toLowerCase().endsWith('.zip')) {
    fileName = `${fileName}.zip`;
  }

  try {
    const res = await fetch(fullUrl, {
      method: 'GET',
    });
    if (!res.ok) {
      throw new Error(`Download HTTP error: ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 5000);
  } catch (error) {
    console.warn('Direct blob download failed, trying server download fallback:', error);
    const filenameOnly = filePath.split('/').pop() || '';
    const fallbackUrl = `${API_BASE_URL}/api/files/download/${encodeURIComponent(filenameOnly)}?name=${encodeURIComponent(fileName)}`;

    const fallbackLink = document.createElement('a');
    fallbackLink.href = fallbackUrl;
    fallbackLink.download = fileName;
    fallbackLink.target = '_blank';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    document.body.removeChild(fallbackLink);
  }
};

// ─── Auth API ────────────────────────────────────────────

export const authAPI = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ─── File API ────────────────────────────────────────────

export const fileAPI = {
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
  },
  uploadMultiple: (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post('/files/upload-multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── PDF API ─────────────────────────────────────────────

export const pdfAPI = {
  merge: (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return api.post('/pdf/merge', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  split: (file: File, mode: string, options?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    if (options?.ranges) formData.append('ranges', JSON.stringify(options.ranges));
    if (options?.pages) formData.append('pages', JSON.stringify(options.pages));
    return api.post('/pdf/split', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  compress: (file: File, level: string = 'medium') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('level', level);
    return api.post('/pdf/compress', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Convert API ─────────────────────────────────────────

export const convertAPI = {
  imageToPdf: (files: File[], options?: any) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    if (options) {
      Object.entries(options).forEach(([key, val]) => formData.append(key, String(val)));
    }
    return api.post('/convert/image-to-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  imageConvert: (file: File, format: string, quality?: number) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('format', format);
    if (quality) formData.append('quality', String(quality));
    return api.post('/convert/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  imagesBatchConvert: (files: File[], format: string, quality?: number) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    formData.append('format', format);
    if (quality) formData.append('quality', String(quality));
    return api.post('/convert/images-batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Project API ─────────────────────────────────────────

export const projectAPI = {
  list: () => api.get('/projects'),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};
