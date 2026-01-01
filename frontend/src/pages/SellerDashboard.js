import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import CouponCard from '../components/CouponCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SellerDashboard = ({ user }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    brand_name: '',
    coupon_code: '',
    expiry_date: '',
    coupon_value: '',
    asking_price: '',
    proof_image_url: ''
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/coupons/my`, {
        withCredentials: true,
      });
      setCoupons(response.data);
    } catch (error) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'seller' || user?.role === 'admin') {
      fetchCoupons();
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setValidationResult(null);

    try {
      const response = await axios.post(
        `${API}/coupons`,
        {
          brand_name: formData.brand_name,
          coupon_code: formData.coupon_code,
          expiry_date: formData.expiry_date,
          coupon_value: parseFloat(formData.coupon_value),
          asking_price: parseFloat(formData.asking_price),
          proof_image_url: formData.proof_image_url || null,
        },
        { withCredentials: true }
      );

      const newCoupon = response.data;
      setValidationResult({
        risk_score: newCoupon.ai_risk_score,
        feedback: newCoupon.ai_feedback,
        status: newCoupon.status
      });

      toast.success('Coupon submitted successfully!');
      fetchCoupons();
      
      setFormData({
        brand_name: '',
        coupon_code: '',
        expiry_date: '',
        coupon_value: '',
        asking_price: '',
        proof_image_url: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit coupon');
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role === 'buyer') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card p-8 text-center">
            <h2 className="text-2xl font-outfit font-bold mb-4">Upgrade to Seller</h2>
            <p className="text-text-secondary">Contact admin to become a seller and start listing coupons.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-outfit font-bold mb-2" data-testid="seller-dashboard-title">My Coupons</h1>
            <p className="text-text-secondary">Manage your coupon listings</p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="btn-primary" data-testid="add-coupon-button">
                <Plus className="w-4 h-4 inline mr-2" />
                Add Coupon
              </button>
            </DialogTrigger>
            <DialogContent className="bg-background-paper border border-border max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-outfit">Add New Coupon</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="brand_name">Brand Name *</Label>
                  <Input
                    id="brand_name"
                    required
                    value={formData.brand_name}
                    onChange={(e) => setFormData({...formData, brand_name: e.target.value})}
                    className="input-field"
                    data-testid="brand-name-input"
                  />
                </div>

                <div>
                  <Label htmlFor="coupon_code">Coupon Code *</Label>
                  <Input
                    id="coupon_code"
                    required
                    value={formData.coupon_code}
                    onChange={(e) => setFormData({...formData, coupon_code: e.target.value})}
                    className="input-field"
                    data-testid="coupon-code-input"
                  />
                </div>

                <div>
                  <Label htmlFor="expiry_date">Expiry Date *</Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                    className="input-field"
                    data-testid="expiry-date-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="coupon_value">Coupon Value ($) *</Label>
                    <Input
                      id="coupon_value"
                      type="number"
                      step="0.01"
                      required
                      value={formData.coupon_value}
                      onChange={(e) => setFormData({...formData, coupon_value: e.target.value})}
                      className="input-field"
                      data-testid="coupon-value-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="asking_price">Asking Price ($) *</Label>
                    <Input
                      id="asking_price"
                      type="number"
                      step="0.01"
                      required
                      value={formData.asking_price}
                      onChange={(e) => setFormData({...formData, asking_price: e.target.value})}
                      className="input-field"
                      data-testid="asking-price-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="proof_image_url">Proof Image URL (Optional)</Label>
                  <Input
                    id="proof_image_url"
                    type="url"
                    value={formData.proof_image_url}
                    onChange={(e) => setFormData({...formData, proof_image_url: e.target.value})}
                    className="input-field"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>

                {validationResult && (
                  <div className={`p-4 rounded-lg border ${
                    validationResult.status === 'approved' ? 'bg-success/10 border-success' :
                    validationResult.status === 'rejected' ? 'bg-error/10 border-error' :
                    'bg-warning/10 border-warning'
                  }`} data-testid="validation-result">
                    <p className="font-semibold mb-2">AI Validation Result</p>
                    <p className="text-sm mb-1">Risk Score: <span className="font-bold uppercase">{validationResult.risk_score}</span></p>
                    <p className="text-sm mb-1">Status: <span className="font-bold uppercase">{validationResult.status}</span></p>
                    <p className="text-sm">Feedback: {validationResult.feedback}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button type="submit" disabled={submitting} className="btn-primary flex-1" data-testid="submit-coupon-button">
                    {submitting ? 'Submitting...' : 'Submit Coupon'}
                  </Button>
                  <Button type="button" onClick={() => setOpen(false)} variant="outline" className="btn-outline">
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="loading-spinner"></div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-secondary text-lg" data-testid="no-coupons-message">You haven't listed any coupons yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="seller-coupons-grid">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.coupon_id} coupon={coupon} onClick={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerDashboard;
