/**
 * Dashboard Page - User projects
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Edit3, Clock, ChevronLeft, LogOut, Loader2, FolderOpen } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuthStore } from '../stores/authStore';
import { projectAPI } from '../services/api';

interface Project {
  _id: string;
  name: string;
  originalFileName: string;
  fileSize: number;
  pageCount: number;
  updatedAt: string;
}

export default function DashboardPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    loadProjects();
  }, [isAuthenticated]);

  const loadProjects = async () => {
    try {
      const response = await projectAPI.list();
      setProjects(response.data.data || []);
    } catch {
      // Projects may not be available if MongoDB is down
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      await projectAPI.delete(id);
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch {}
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-surface-950 overflow-y-auto">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">My Projects</h1>
            <p className="text-surface-400 text-sm mt-1">Your saved PDF editing projects</p>
          </div>
          <Link to="/editor" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="card p-16 text-center">
            <FolderOpen className="w-16 h-16 text-surface-700 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-surface-300 mb-2">No projects yet</h3>
            <p className="text-surface-500 text-sm mb-6">Upload a PDF to start your first project</p>
            <Link to="/editor" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Open Editor
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div key={project._id} className="card-hover group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-red-400" />
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(project._id); }}
                    className="btn-icon p-1 opacity-0 group-hover:opacity-100 transition-opacity text-surface-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-medium text-white truncate mb-1">{project.name}</h3>
                <p className="text-xs text-surface-500 truncate mb-3">{project.originalFileName}</p>

                <div className="flex items-center gap-3 text-xs text-surface-500">
                  <span>{project.pageCount} pages</span>
                  <span>·</span>
                  <span>{formatSize(project.fileSize)}</span>
                  <span>·</span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(project.updatedAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
