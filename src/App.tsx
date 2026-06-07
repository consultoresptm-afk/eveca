/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Effluents from './pages/Effluents';
import Compost from './pages/Compost';
import Admin from './pages/Admin';
import Setup from './pages/Setup';
import Environmental from './pages/Environmental';
import GreenAreas from './pages/GreenAreas';
import Sustainability from './pages/Sustainability';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/efluentes" element={<Effluents />} />
            <Route path="/compostaje" element={<Compost />} />
            
            <Route path="/gestion-ambiental" element={<Environmental />} />
            <Route path="/zonas-verdes" element={<GreenAreas />} />
            <Route path="/sostenibilidad" element={<Sustainability />} />
            
            <Route path="/admin" element={<Admin />} />
            <Route path="/setup" element={<Setup />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

