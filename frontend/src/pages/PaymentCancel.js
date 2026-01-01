import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md mx-auto px-4">
        <div className="card p-8 text-center">
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-error" />
          </div>

          <h1 className="text-3xl font-outfit font-bold mb-4" data-testid="payment-cancel-title">
            Payment Cancelled
          </h1>
          <p className="text-text-secondary mb-8" data-testid="payment-cancel-message">
            Your payment was cancelled. No charges were made.
          </p>

          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary w-full"
            data-testid="back-to-dashboard-button"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
