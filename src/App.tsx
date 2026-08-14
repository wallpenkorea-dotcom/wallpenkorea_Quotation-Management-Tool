import React, { useState, useEffect } from 'react';
import { Building2, Plus, LogOut, FileSpreadsheet, Download, ShieldCheck, User, ArrowLeft } from 'lucide-react';
import { ProjectItem, AdminUser } from './types';
import { LoginForm } from './components/LoginForm';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { NewProjectModal } from './components/NewProjectModal';
import { PublicShareView } from './components/PublicShareView';

export default function App() {
  // Routing state based on Hash or URL
  const [shareToken, setShareToken] = useState<string | null>(null);

  // Auth state
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('wallpen_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Data states
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Parse share token from URL hash or path
  const checkShareRoute = () => {
    const hash = window.location.hash;
    const path = window.location.pathname;

    // Check hash e.g. #share=wp_xxx
    if (hash.startsWith('#share=')) {
      const token = hash.replace('#share=', '').trim();
      if (token) {
        setShareToken(token);
        return;
      }
    }

    // Check path e.g. /share/wp_xxx
    if (path.startsWith('/share/')) {
      const token = path.replace('/share/', '').trim();
      if (token) {
        setShareToken(token);
        return;
      }
    }

    setShareToken(null);
  };

  useEffect(() => {
    checkShareRoute();
    const handleHashChange = () => checkShareRoute();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        // If there is an active selected project, refresh its data
        if (selectedProject) {
          const matched = data.find((p: ProjectItem) => p.id === selectedProject.id);
          if (matched) setSelectedProject(matched);
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !shareToken) {
      loadProjects();
    }
  }, [user, shareToken]);

  const handleLoginSuccess = (loggedInUser: AdminUser, token: string) => {
    setUser(loggedInUser);
    localStorage.setItem('wallpen_auth_user', JSON.stringify(loggedInUser));
    localStorage.setItem('wallpen_auth_token', token);
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedProject(null);
    localStorage.removeItem('wallpen_auth_user');
    localStorage.removeItem('wallpen_auth_token');
  };

  const handleProjectCreated = (newProject: ProjectItem) => {
    setIsNewModalOpen(false);
    setProjects((prev) => [newProject, ...prev]);
    setSelectedProject(newProject);
  };

  const handleProjectUpdated = (updated: ProjectItem) => {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSelectedProject(updated);
  };

  const handleProjectDeleted = (deletedId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== deletedId));
    setSelectedProject(null);
  };

  // If a public share token is present in the URL, render the Public view exclusively
  if (shareToken) {
    return <PublicShareView token={shareToken} />;
  }

  // If not logged in as admin, render Login form
  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Name / Breadcrumb */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => {
                  setSelectedProject(null);
                  loadProjects();
                }}
                className="flex items-center gap-3 cursor-pointer select-none group"
                title="현장 관리 목록으로 이동"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition">
                      월펜 현장 견적 관리
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      관리자 모드
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    WallPen Korea Construction & Quote Portal
                  </div>
                </div>
              </div>

              {selectedProject && (
                <button
                  type="button"
                  id="header-back-button"
                  onClick={() => {
                    setSelectedProject(null);
                    loadProjects();
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer border border-slate-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  전체 현장 목록
                </button>
              )}
            </div>

            {/* Right Header Navigation & Actions */}
            <div className="flex items-center gap-3">
              <a
                href="/api/projects/sample-template"
                download="Wallpen_Sample_Estimate.xlsx"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition shadow-2xs"
                title="테스트용 샘플 엑셀 견적서 다운로드"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                샘플 엑셀
              </a>

              <button
                type="button"
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">새 현장 등록</span>
              </button>

              <div className="h-5 w-px bg-slate-200" />

              {/* User and Logout */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right text-xs">
                  <span className="font-semibold text-slate-800">{user.name}</span>
                  <span className="text-[11px] text-slate-400">{user.email}</span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedProject ? (
          <ProjectDetail
            project={selectedProject}
            onBack={() => {
              setSelectedProject(null);
              loadProjects();
            }}
            onUpdateSuccess={handleProjectUpdated}
            onDeleteSuccess={handleProjectDeleted}
          />
        ) : (
          <ProjectList
            projects={projects}
            onSelectProject={(p) => setSelectedProject(p)}
            onOpenNewModal={() => setIsNewModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 월펜코리아 (WallPen Korea). All rights reserved.</span>
          <span>벽면프린트 시공 견적 & 현장 파일 공유 플랫폼</span>
        </div>
      </footer>

      {/* New Project Registration Modal (Excel Upload & Review) */}
      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSuccess={handleProjectCreated}
      />
    </div>
  );
}
