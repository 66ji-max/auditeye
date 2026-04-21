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
  ];

  return (
    <div className="h-screen w-screen bg-[#121212] flex flex-col font-sans overflow-hidden">
      {/* Global Top Navbar */}
      <header className="h-12 bg-[#1A1A1A] border-b border-[#333333] flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-lg tracking-wide cursor-pointer" onClick={() => navigate('/')}>
            <ShieldAlert className="w-5 h-5" />
            <span>AuditEye</span>
          </div>

          <nav className="flex items-center gap-2">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`px-3 py-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  location.pathname === item.path || (item.path === '/' && location.pathname.startsWith('/project/'))
                    ? 'bg-[#333333] text-gray-100'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#242424]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 border-r border-[#333333] pr-4">
            <ShieldAlert className="w-3.5 h-3.5 text-green-500" />
            系统脱敏保护
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {isAdmin ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-amber-500 font-medium px-2 py-1 bg-amber-500/10 rounded">
                  <Shield className="w-3.5 h-3.5" />
                  <span>管理员模式</span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 hover:bg-[#242424] px-2 py-1 rounded transition-colors"
                  title="退出管理员模式"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 text-gray-400">
                  <User className="w-3.5 h-3.5" />
                  <span>用户模式</span>
                </div>
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="px-3 py-1 text-xs font-medium bg-[#333333] text-gray-300 hover:bg-[#444444] hover:text-white rounded transition-colors"
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
