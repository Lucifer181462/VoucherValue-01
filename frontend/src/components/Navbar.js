import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Home, Wallet, User, ShoppingBag, Package } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Navbar = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <nav className="glass-heavy sticky top-0 z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center space-x-2" data-testid="logo-link">
            <Package className="w-8 h-8 text-primary" />
            <span className="text-xl font-outfit font-bold">VoucherValue</span>
          </Link>

          <div className="flex items-center space-x-6">
            {user?.role === 'buyer' && (
              <Link to="/dashboard" className="flex items-center space-x-1 text-text-secondary hover:text-primary transition-colors" data-testid="buyer-dashboard-link">
                <ShoppingBag className="w-5 h-5" />
                <span>Browse</span>
              </Link>
            )}

            {(user?.role === 'seller' || user?.role === 'admin') && (
              <Link to="/seller" className="flex items-center space-x-1 text-text-secondary hover:text-primary transition-colors" data-testid="seller-dashboard-link">
                <Package className="w-5 h-5" />
                <span>My Coupons</span>
              </Link>
            )}

            {user?.role === 'admin' && (
              <Link to="/admin" className="flex items-center space-x-1 text-text-secondary hover:text-primary transition-colors" data-testid="admin-panel-link">
                <Home className="w-5 h-5" />
                <span>Admin</span>
              </Link>
            )}

            <Link to="/wallet" className="flex items-center space-x-1 text-text-secondary hover:text-primary transition-colors" data-testid="wallet-link">
              <Wallet className="w-5 h-5" />
              <span>Wallet</span>
            </Link>

            <Link to="/profile" className="flex items-center space-x-1 text-text-secondary hover:text-primary transition-colors" data-testid="profile-link">
              <User className="w-5 h-5" />
              <span>Profile</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-text-secondary hover:text-error transition-colors"
              data-testid="logout-button"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
