import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './api/api';
import Layout from './components/Layout';
import Login from './pages/Login';
import Form from './pages/Form';
import Admin from './pages/Admin';
import History from './pages/History';

import DevConsole from './pages/DevConsole';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        // Response payload structure is { user: { id, email, role, name } }
        if (res.data && res.data.user) {
          setUser(res.data.user);
        } else {
          setUser(null);
        }
        setChecking(false);
      })
      .catch(() => {
        setUser(null);
        setChecking(false);
      });
  }, []);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const getRedirectPath = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'dev' || role === 'developer') return '/admin/dev';
    return '/form';
  };

  if (checking) return <div style={{ textAlign: 'center', padding: '3rem' }}>Securing access...</div>;

  return (
    <BrowserRouter>
      <Layout onLogout={handleLogout} user={user}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to={getRedirectPath(user.role)} /> : <Login onAuthSuccess={setUser} />} />
          <Route path="/form" element={user && user.role !== 'admin' && user.role !== 'dev' && user.role !== 'developer' ? <Form /> : <Navigate to="/login" />} />
          <Route path="/history" element={user && user.role !== 'admin' && user.role !== 'dev' && user.role !== 'developer' ? <History /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user && user.role === 'admin' ? <Admin /> : <Navigate to="/login" />} />
          <Route path="/admin/dev" element={user && (user.role === 'admin' || user.role === 'dev' || user.role === 'developer') ? <DevConsole /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={user ? getRedirectPath(user.role) : '/login'} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
