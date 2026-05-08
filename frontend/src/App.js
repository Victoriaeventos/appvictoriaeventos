import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import Login from './pages/Login';
import Register from './pages/Register';
import PlannerDashboard from './pages/PlannerDashboard';
import CoupleDashboard from './pages/CoupleDashboard';
import EventDetail from './pages/EventDetail';
import HowItWorks from './pages/HowItWorks';
import { Toaster } from '@/components/ui/sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Setup axios interceptor
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`);
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F5F1E8] to-white">
        <div className="text-2xl font-playfair text-[#D4AF37]">Cargando...</div>
      </div>
    );
  }

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register setUser={setUser} /> : <Navigate to="/dashboard" />} />
          <Route
            path="/dashboard"
            element={
              user ? (
                user.role === 'planner' ? (
                  <PlannerDashboard user={user} setUser={setUser} />
                ) : (
                  <CoupleDashboard user={user} setUser={setUser} />
                )
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/event/:eventId"
            element={user ? <EventDetail user={user} /> : <Navigate to="/login" />}
          />
          <Route
            path="/como-funciona"
            element={<HowItWorks user={user} />}
          />
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;