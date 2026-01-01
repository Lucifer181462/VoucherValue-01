import React from 'react';
import { Star } from 'lucide-react';

const CouponCard = ({ coupon, onClick }) => {
  const discount = coupon.coupon_value > 0 
    ? Math.round(((coupon.coupon_value - coupon.asking_price) / coupon.coupon_value) * 100)
    : 0;

  return (
    <div
      onClick={onClick}
      className="card p-6 cursor-pointer hover-lift group"
      data-testid={`coupon-card-${coupon.coupon_id}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-outfit font-bold text-text-primary mb-1" data-testid="coupon-brand">
            {coupon.brand_name}
          </h3>
          <p className="text-sm text-text-muted" data-testid="coupon-expiry">Expires: {coupon.expiry_date}</p>
        </div>
        <div className="bg-primary/10 px-3 py-1 rounded-full">
          <span className="text-primary font-bold" data-testid="coupon-discount">{discount}% OFF</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-text-secondary">Original Value:</span>
          <span className="text-text-primary font-semibold" data-testid="coupon-value">${coupon.coupon_value.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-secondary">Buy for:</span>
          <span className="text-primary font-bold text-lg" data-testid="coupon-price">${coupon.asking_price.toFixed(2)}</span>
        </div>
      </div>

      {coupon.status === 'sold' && (
        <div className="bg-error/10 text-error px-3 py-2 rounded-lg text-center font-medium" data-testid="coupon-sold-badge">
          SOLD
        </div>
      )}

      {coupon.status === 'approved' && (
        <div className="bg-success/10 text-success px-3 py-2 rounded-lg text-center font-medium" data-testid="coupon-available-badge">
          AVAILABLE
        </div>
      )}

      {coupon.status === 'pending' && (
        <div className="bg-warning/10 text-warning px-3 py-2 rounded-lg text-center font-medium" data-testid="coupon-pending-badge">
          PENDING REVIEW
        </div>
      )}

      {coupon.status === 'rejected' && (
        <div className="bg-error/10 text-error px-3 py-2 rounded-lg text-center font-medium" data-testid="coupon-rejected-badge">
          REJECTED
        </div>
      )}
    </div>
  );
};

export default CouponCard;
