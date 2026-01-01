import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Search, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import CouponCard from '../components/CouponCard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BuyerDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchBrand, setSearchBrand] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchBrand) params.append('brand', searchBrand);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      params.append('status', 'approved');

      const response = await axios.get(`${API}/coupons?${params.toString()}`);
      setCoupons(response.data);
    } catch (error) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleSearch = () => {
    fetchCoupons();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-outfit font-bold mb-2" data-testid="buyer-dashboard-title">Browse Coupons</h1>
          <p className="text-text-secondary">Find amazing deals on verified coupons</p>
        </div>

        {/* Filters */}
        <div className="card p-6 mb-8">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="search-brand">Brand</label>
              <input
                id="search-brand"
                type="text"
                placeholder="Search by brand"
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                className="input-field"
                data-testid="search-brand-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="min-price">Min Price</label>
              <input
                id="min-price"
                type="number"
                placeholder="$0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="input-field"
                data-testid="min-price-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="max-price">Max Price</label>
              <input
                id="max-price"
                type="number"
                placeholder="$1000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="input-field"
                data-testid="max-price-input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="btn-primary w-full"
                data-testid="search-button"
              >
                <Search className="w-4 h-4 inline mr-2" />
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Coupons Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="loading-spinner"></div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-secondary text-lg" data-testid="no-coupons-message">No coupons found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="coupons-grid">
            {coupons.map((coupon) => (
              <CouponCard
                key={coupon.coupon_id}
                coupon={coupon}
                onClick={() => navigate(`/coupon/${coupon.coupon_id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
