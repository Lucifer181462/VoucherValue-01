import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Shield, Zap, TrendingUp, Package } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial opacity-50"></div>
        
        <nav className="glass-heavy relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Package className="w-8 h-8 text-primary" />
                <span className="text-2xl font-outfit font-bold">VoucherValue</span>
              </div>
              <button
                onClick={handleLogin}
                className="btn-primary"
                data-testid="login-button"
              >
                Get Started <ArrowRight className="w-4 h-4 inline ml-2" />
              </button>
            </div>
          </div>
        </nav>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-outfit font-bold mb-6 leading-tight" data-testid="hero-title">
              Turn Unused Coupons Into
              <span className="text-primary block mt-2">Cold Hard Cash</span>
            </h1>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto" data-testid="hero-subtitle">
              The secure marketplace for buying and selling discount coupons. AI-powered validation, escrow protection, and instant transactions.
            </p>
            <button
              onClick={handleLogin}
              className="btn-primary text-lg px-8 py-3"
              data-testid="hero-cta-button"
            >
              Start Trading Now <ArrowRight className="w-5 h-5 inline ml-2" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-background-paper">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-outfit font-bold text-center mb-16" data-testid="features-title">
            Why Choose VoucherValue?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card p-8 text-center hover-lift" data-testid="feature-ai-validation">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-outfit font-bold mb-4">AI Validation</h3>
              <p className="text-text-secondary">
                Every coupon is verified by advanced AI to detect fraud, validate expiry dates, and ensure authenticity.
              </p>
            </div>

            <div className="card p-8 text-center hover-lift" data-testid="feature-escrow">
              <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-secondary" />
              </div>
              <h3 className="text-2xl font-outfit font-bold mb-4">Secure Escrow</h3>
              <p className="text-text-secondary">
                Your money is held safely until you confirm the coupon works. Buyer and seller protection guaranteed.
              </p>
            </div>

            <div className="card p-8 text-center hover-lift" data-testid="feature-earnings">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-outfit font-bold mb-4">Easy Earnings</h3>
              <p className="text-text-secondary">
                List your unused coupons in seconds. Get paid directly to your wallet. Withdraw anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-outfit font-bold text-center mb-4" data-testid="how-it-works-title">
            How It Works
          </h2>
          <p className="text-text-secondary text-center mb-16">Simple, secure, and fast</p>

          <div className="grid md:grid-cols-2 gap-12">
            {/* For Sellers */}
            <div className="space-y-6">
              <h3 className="text-2xl font-outfit font-bold text-primary mb-6" data-testid="for-sellers-title">For Sellers</h3>
              
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">1</div>
                <div>
                  <h4 className="font-semibold mb-2">Upload Your Coupon</h4>
                  <p className="text-text-secondary">Add brand, code, expiry date, and set your price</p>
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">2</div>
                <div>
                  <h4 className="font-semibold mb-2">AI Validates</h4>
                  <p className="text-text-secondary">Our AI checks authenticity and assigns a risk score</p>
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">3</div>
                <div>
                  <h4 className="font-semibold mb-2">Get Paid</h4>
                  <p className="text-text-secondary">When buyer confirms it works, money goes to your wallet</p>
                </div>
              </div>
            </div>

            {/* For Buyers */}
            <div className="space-y-6">
              <h3 className="text-2xl font-outfit font-bold text-secondary mb-6" data-testid="for-buyers-title">For Buyers</h3>
              
              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary font-bold">1</div>
                <div>
                  <h4 className="font-semibold mb-2">Browse Coupons</h4>
                  <p className="text-text-secondary">Filter by brand, discount, and price</p>
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary font-bold">2</div>
                <div>
                  <h4 className="font-semibold mb-2">Buy Securely</h4>
                  <p className="text-text-secondary">Payment held in escrow until you confirm</p>
                </div>
              </div>

              <div className="flex space-x-4">
                <div className="flex-shrink-0 w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary font-bold">3</div>
                <div>
                  <h4 className="font-semibold mb-2">Use & Save</h4>
                  <p className="text-text-secondary">Get instant access to coupon code and start saving</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-background-paper">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-outfit font-bold mb-6" data-testid="cta-title">
            Ready to Start Saving?
          </h2>
          <p className="text-xl text-text-secondary mb-8">
            Join thousands of smart shoppers turning coupons into cash
          </p>
          <button
            onClick={handleLogin}
            className="btn-primary text-lg px-8 py-3"
            data-testid="cta-button"
          >
            Join VoucherValue Now <ArrowRight className="w-5 h-5 inline ml-2" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-text-muted">
          <p>&copy; 2025 VoucherValue. Built with trust and security in mind.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
