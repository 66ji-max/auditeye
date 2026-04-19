import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import Workspace from './pages/Workspace';
import ProjectList from './pages/ProjectList';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/project/:id" element={<Workspace />} />
      </Routes>
    </BrowserRouter>
  );
}
