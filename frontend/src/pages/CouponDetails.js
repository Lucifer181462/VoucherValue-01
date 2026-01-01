import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { ShoppingCart, Calendar, DollarSign, Tag } from 'lucide-react';
import Navbar from '../components/Navbar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CouponDetails = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    const fetchCoupon = async () => {
      try {
        const response = await axios.get(`${API}/coupons/${id}`);
        setCoupon(response.data);
      } catch (error) {
        toast.error('Coupon not found');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchCoupon();
  }, [id, navigate]);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const originUrl = window.location.origin;
      
      const response = await axios.post(
        `${API}/checkout/session`,
        {
          coupon_id: id,
          origin_url: originUrl,
        },
        { 
          withCredentials: true,
          params: { coupon_id: id }
        }
      );

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Purchase failed');
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="flex justify-center items-center py-20">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  const discount = coupon.coupon_value > 0
    ? Math.round(((coupon.coupon_value - coupon.asking_price) / coupon.coupon_value) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-text-secondary hover:text-primary mb-6 transition-colors"
          data-testid="back-button"
        >
          ← Back to Browse
        </button>

        <div className="card p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-outfit font-bold mb-2" data-testid="coupon-details-brand">
                {coupon.brand_name}
              </h1>
              <div className="flex items-center space-x-2 text-text-secondary">
                <Calendar className="w-4 h-4" />
                <span data-testid="coupon-details-expiry">Expires: {coupon.expiry_date}</span>
              </div>
            </div>
            <div className="bg-primary/10 px-4 py-2 rounded-full">
              <span className="text-primary font-bold text-xl" data-testid="coupon-details-discount">{discount}% OFF</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-background-subtle p-6 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Tag className="w-5 h-5 text-text-secondary" />
                <span className="text-text-secondary">Original Value</span>
              </div>
              <p className="text-3xl font-bold" data-testid="coupon-details-value">${coupon.coupon_value.toFixed(2)}</p>
            </div>

            <div className="bg-primary/10 p-6 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <span className="text-primary font-medium">Buy for Only</span>
              </div>
              <p className="text-3xl font-bold text-primary" data-testid="coupon-details-price">${coupon.asking_price.toFixed(2)}</p>
            </div>
          </div>

          {coupon.ai_risk_score && (
            <div className="mb-6">
              <div className={`p-4 rounded-lg border ${
                coupon.ai_risk_score === 'low' ? 'bg-success/10 border-success' :
                coupon.ai_risk_score === 'high' ? 'bg-error/10 border-error' :
                'bg-warning/10 border-warning'
              }`}>
                <p className="font-semibold mb-1">AI Validation</p>
                <p className="text-sm">Risk Score: <span className="font-bold uppercase">{coupon.ai_risk_score}</span></p>
                {coupon.ai_feedback && (
                  <p className="text-sm mt-1">{coupon.ai_feedback}</p>
                )}
              </div>
            </div>
          )}

          {coupon.proof_image_url && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Proof Image</p>
              <img
                src={coupon.proof_image_url}
                alt="Coupon proof"
                className="w-full max-w-md rounded-lg border border-border"
              />
            </div>
          )}

          {coupon.status === 'approved' && (
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="btn-primary w-full text-lg py-3"
              data-testid="purchase-button"
            >
              {purchasing ? (
                <span>Processing...</span>
              ) : (
                <span>
                  <ShoppingCart className="w-5 h-5 inline mr-2" />
                  Purchase Coupon - ${coupon.asking_price.toFixed(2)}
                </span>
              )}
            </button>
          )}

          {coupon.status === 'sold' && (
            <div className="bg-error/10 text-error px-6 py-3 rounded-lg text-center font-medium">
              This coupon has been sold
            </div>
          )}

          {coupon.status === 'pending' && (
            <div className="bg-warning/10 text-warning px-6 py-3 rounded-lg text-center font-medium">
              This coupon is pending review
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CouponDetails;
