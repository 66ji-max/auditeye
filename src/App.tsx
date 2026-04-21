import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import Workspace from './pages/Workspace';
import ProjectList from './pages/ProjectList';
import RuleEngine from './pages/RuleEngine';
import KnowledgeBase from './pages/KnowledgeBase';
import Layout from './components/Layout';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<ProjectList />} />
            <Route path="/project/:id" element={<Workspace />} />
            <Route path="/rules" element={<RuleEngine />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
