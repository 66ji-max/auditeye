import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ShieldAlert, Folder, BookOpen, Settings, User } from 'lucide-react';
import ToastContainer from './Toast.tsx';

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

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
            数据脱敏已开启
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="w-6 h-6 rounded-full bg-[#333333] flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </div>
            <span>高级合伙人 (Admin)</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {children}
      </main>
      
      <ToastContainer />
    </div>
  );
}
