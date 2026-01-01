import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import Landing from './pages/Landing';
import AuthCallback from './pages/AuthCallback';
import BuyerDashboard from './pages/BuyerDashboard';
import SellerDashboard from './pages/SellerDashboard';
import AdminPanel from './pages/AdminPanel';
import CouponDetails from './pages/CouponDetails';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function AppRouter() {
  const location = window.location;
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><BuyerDashboard /></ProtectedRoute>
      } />
      <Route path="/seller" element={
        <ProtectedRoute><SellerDashboard /></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute><AdminPanel /></ProtectedRoute>
      } />
      <Route path="/coupon/:id" element={
        <ProtectedRoute><CouponDetails /></ProtectedRoute>
      } />
      <Route path="/wallet" element={
        <ProtectedRoute><Wallet /></ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />
      <Route path="/payment/success" element={
        <ProtectedRoute><PaymentSuccess /></ProtectedRoute>
      } />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="App min-h-screen bg-background text-text-primary">
        <AppRouter />
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  );
}

export default App;
