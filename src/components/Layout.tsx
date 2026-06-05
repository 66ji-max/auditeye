import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ShieldAlert, Folder, BookOpen, Settings, User, LogOut, Shield } from 'lucide-react';
import ToastContainer from './Toast.tsx';
import { useAuth } from '../context/AuthContext';
import AdminLoginModal from './AdminLoginModal';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, logout } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const navItems = [
    { label: '项目管理', path: '/', icon: <Folder className="w-4 h-4" /> },
    { label: '知识库', path: '/knowledge', icon: <BookOpen className="w-4 h-4" /> },
    { label: '规则引擎', path: '/rules', icon: <Settings className="w-4 h-4" /> },
    { label: '合规与伦理', path: '/compliance', icon: <Shield className="w-4 h-4" /> },
    { label: '模型训练', path: '/model-training', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-webhook"><path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9n-.01.01A3.98 3.98 0 0 1 6 20h-.01c-2.2 0-4-1.8-4-4 0-1.17.5-2.22 1.3-3.02L5 11"/><path d="m15 6 3.4-5.8"/><path d="m2 16 5.8-3.4"/><path d="M11 6h6l-3-6"/><path d="M18 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/><path d="M8 11.2a3 3 0 1 0-3-5.2 3 3 0 0 0 3 5.2Z"/></svg> },
  ];

  return (
    <div className="h-screen w-screen bg-brand-bg flex flex-col font-sans overflow-hidden">
      {/* Global Top Navbar */}
      <header className="h-14 bg-[#0B1020] border-b border-[rgba(148,163,184,0.14)] flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-[#38BDF8] font-bold text-lg tracking-wide cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-5 h-5 flex items-center justify-center bg-brand-blue-light/10 rounded-sm">
              <span className="text-xl leading-none -mt-0.5" role="img" aria-label="Eye">👁</span>
            </div>
            <span>AuditEye</span>
          </div>

          <nav className="flex items-center gap-2">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/project/'))
                    ? 'bg-[rgba(56,189,248,0.08)] border border-[rgba(56,189,248,0.22)] text-[#F8FAFC]'
                    : 'text-[#CBD5E1] border border-transparent hover:bg-[rgba(148,163,184,0.08)]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-brand-muted border-r border-brand-border-subtle pr-4">
            <ShieldAlert className="w-3.5 h-3.5 text-green-500" />
            系统脱敏保护
          </div>
          <div className="flex items-center gap-3 text-xs text-brand-muted">
            {isAdmin ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-amber-500 font-medium px-2 py-1 bg-amber-500/10 rounded border border-amber-500/20">
                  <Shield className="w-3.5 h-3.5" />
                  <span>管理员模式</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-brand-muted hover:text-brand-primary hover:bg-brand-surface px-2 py-1 rounded transition-colors"
                  title="退出管理员模式"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 text-brand-muted">
                  <User className="w-3.5 h-3.5" />
                  <span>用户模式</span>
                </div>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-3 py-1 text-xs font-medium bg-[rgba(56,189,248,0.12)] text-[#D9E4F5] hover:bg-[#1A73D9] hover:text-white rounded transition-colors"
                >
                  高级登录
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
      
      <ToastContainer />
      <AdminLoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </div>
  );
}
