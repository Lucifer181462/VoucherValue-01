import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle, Copy } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PaymentSuccess = ({ user }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState(null);
  const [couponCode, setCouponCode] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (!sessionId) {
      navigate('/dashboard');
      return;
    }

    const pollPaymentStatus = async (attempts = 0) => {
      const maxAttempts = 5;
      const pollInterval = 2000;

      if (attempts >= maxAttempts) {
        toast.error('Payment verification timed out. Please check your wallet.');
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${API}/checkout/status/${sessionId}`,
          { withCredentials: true }
        );

        if (response.data.payment_status === 'paid') {
          const transactionsRes = await axios.get(
            `${API}/transactions/my`,
            { withCredentials: true }
          );
          
          const myTransaction = transactionsRes.data.find(
            t => t.coupon_id === response.data.coupon_id && t.buyer_id === user?.user_id
          );

          if (myTransaction) {
            setTransaction(myTransaction);
            
            try {
              const couponRes = await axios.get(
                `${API}/transactions/${myTransaction.transaction_id}/coupon-code`,
                { withCredentials: true }
              );
              setCouponCode(couponRes.data);
            } catch (error) {
              console.error('Failed to fetch coupon code:', error);
            }
          }
          
          setLoading(false);
          return;
        }

        if (response.data.status === 'expired') {
          toast.error('Payment session expired');
          setLoading(false);
          return;
        }

        setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
      } catch (error) {
        console.error('Error checking payment status:', error);
        setTimeout(() => pollPaymentStatus(attempts + 1), pollInterval);
      }
    };

    pollPaymentStatus();
  }, [sessionId, navigate, user]);

  const handleConfirm = async () => {
    if (!transaction) return;
    
    setConfirming(true);
    try {
      await axios.post(
        `${API}/transactions/${transaction.transaction_id}/confirm`,
        {},
        { withCredentials: true }
      );
      toast.success('Transaction confirmed! Seller has been paid.');
      navigate('/wallet');
    } catch (error) {
      toast.error('Failed to confirm transaction');
    } finally {
      setConfirming(false);
    }
  };

  const copyCouponCode = () => {
    if (couponCode) {
      navigator.clipboard.writeText(couponCode.coupon_code);
      toast.success('Coupon code copied!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="flex flex-col justify-center items-center py-20">
          <div className="loading-spinner mb-4"></div>
          <p className="text-text-secondary" data-testid="payment-verifying-message">Verifying payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card p-8 text-center">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>

          <h1 className="text-4xl font-outfit font-bold mb-4" data-testid="payment-success-title">
            Payment Successful!
          </h1>
          <p className="text-text-secondary mb-8" data-testid="payment-success-message">
            Your coupon purchase has been completed.
          </p>

          {couponCode && (
            <div className="bg-background-subtle p-6 rounded-lg mb-6">
              <h3 className="text-xl font-outfit font-bold mb-4">Your Coupon Code</h3>
              
              <div className="bg-background-paper border-2 border-primary/30 p-6 rounded-lg mb-4">
                <p className="text-sm text-text-secondary mb-2">Brand</p>
                <p className="text-xl font-semibold mb-4" data-testid="coupon-brand-name">{couponCode.brand_name}</p>
                
                <p className="text-sm text-text-secondary mb-2">Coupon Code</p>
                <div className="flex items-center justify-center space-x-3">
                  <p className="text-3xl font-mono font-bold text-primary" data-testid="revealed-coupon-code">
                    {couponCode.coupon_code}
                  </p>
                  <button
                    onClick={copyCouponCode}
                    className="p-2 hover:bg-primary/10 rounded transition-colors"
                    data-testid="copy-coupon-button"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-sm text-text-secondary mt-4">Expires: {couponCode.expiry_date}</p>
              </div>

              <div className="bg-warning/10 border border-warning/30 p-4 rounded-lg mb-4">
                <p className="text-sm text-text-secondary">
                  Please confirm below once you've successfully used this coupon. This will release payment to the seller.
                </p>
              </div>

              <Button
                onClick={handleConfirm}
                disabled={confirming || transaction?.status !== 'escrow'}
                className="btn-primary w-full"
                data-testid="confirm-coupon-button"
              >
                {confirming ? 'Confirming...' : 'Confirm Coupon Worked'}
              </Button>
            </div>
          )}

          <div className="flex space-x-4 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-outline"
              data-testid="back-to-dashboard-button"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/wallet')}
              className="btn-primary"
              data-testid="view-wallet-button"
            >
              View Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
