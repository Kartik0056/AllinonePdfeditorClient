/**
 * API Service - Axios instance with JWT interceptor
 */

import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: '/api',
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
