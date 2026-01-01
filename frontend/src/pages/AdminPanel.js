import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { BarChart3, Users, Package, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPanel = ({ user }) => {
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, usersRes, couponsRes, disputesRes] = await Promise.all([
        axios.get(`${API}/admin/analytics`, { withCredentials: true }),
        axios.get(`${API}/admin/users`, { withCredentials: true }),
        axios.get(`${API}/coupons?limit=100`),
        axios.get(`${API}/admin/disputes`, { withCredentials: true }),
      ]);
      
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data);
      setCoupons(couponsRes.data);
      setDisputes(disputesRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCoupon = async (couponId, status) => {
    try {
      await axios.patch(
        `${API}/admin/coupons/${couponId}`,
        { status },
        { withCredentials: true }
      );
      toast.success(`Coupon ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update coupon');
    }
  };

  const handleResolveDispute = async (disputeId) => {
    try {
      await axios.patch(
        `${API}/admin/disputes/${disputeId}`,
        { resolution: 'Resolved by admin' },
        { withCredentials: true, params: { resolution: 'Resolved by admin' } }
      );
      toast.success('Dispute resolved');
      fetchData();
    } catch (error) {
      toast.error('Failed to resolve dispute');
    }
  };

  const handleUpdateUserRole = async (userId, role) => {
    try {
      await axios.patch(
        `${API}/admin/users/${userId}/role`,
        { role },
        { withCredentials: true, params: { role } }
      );
      toast.success('User role updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="card p-8 text-center">
            <h2 className="text-2xl font-outfit font-bold mb-4">Access Denied</h2>
            <p className="text-text-secondary">You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-outfit font-bold mb-8" data-testid="admin-panel-title">Admin Panel</h1>

        {/* Analytics Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-2">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-text-secondary text-sm">Total Users</p>
                <p className="text-3xl font-bold" data-testid="total-users">{analytics?.total_users || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-2">
              <Package className="w-8 h-8 text-secondary" />
              <div>
                <p className="text-text-secondary text-sm">Total Coupons</p>
                <p className="text-3xl font-bold" data-testid="total-coupons">{analytics?.total_coupons || 0}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-2">
              <BarChart3 className="w-8 h-8 text-success" />
              <div>
                <p className="text-text-secondary text-sm">Total Sales</p>
                <p className="text-3xl font-bold" data-testid="total-sales">${analytics?.total_sales?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center space-x-3 mb-2">
              <AlertTriangle className="w-8 h-8 text-error" />
              <div>
                <p className="text-text-secondary text-sm">Fraud Attempts</p>
                <p className="text-3xl font-bold" data-testid="fraud-attempts">{analytics?.fraud_attempts || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="coupons" className="space-y-6">
          <TabsList className="bg-background-paper border border-border">
            <TabsTrigger value="coupons" data-testid="coupons-tab">Coupons</TabsTrigger>
            <TabsTrigger value="users" data-testid="users-tab">Users</TabsTrigger>
            <TabsTrigger value="disputes" data-testid="disputes-tab">Disputes</TabsTrigger>
          </TabsList>

          <TabsContent value="coupons">
            <div className="card">
              <div className="p-6 border-b border-border">
                <h2 className="text-2xl font-outfit font-bold">Coupon Management</h2>
              </div>
              
              <div className="overflow-x-auto">
                {coupons.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary">No coupons found</div>
                ) : (
                  <table className="w-full" data-testid="coupons-table">
                    <thead className="bg-background-subtle">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium">Brand</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Price</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Risk Score</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {coupons.map((coupon) => (
                        <tr key={coupon.coupon_id} className="hover:bg-background-subtle transition-colors">
                          <td className="px-6 py-4 text-sm font-semibold">{coupon.brand_name}</td>
                          <td className="px-6 py-4 text-sm">${coupon.asking_price.toFixed(2)}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              coupon.ai_risk_score === 'low' ? 'bg-success/10 text-success' :
                              coupon.ai_risk_score === 'high' ? 'bg-error/10 text-error' :
                              'bg-warning/10 text-warning'
                            }`}>
                              {coupon.ai_risk_score?.toUpperCase() || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              coupon.status === 'approved' ? 'bg-success/10 text-success' :
                              coupon.status === 'rejected' ? 'bg-error/10 text-error' :
                              coupon.status === 'sold' ? 'bg-info/10 text-info' :
                              'bg-warning/10 text-warning'
                            }`}>
                              {coupon.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex space-x-2">
                              {coupon.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateCoupon(coupon.coupon_id, 'approved')}
                                    className="p-1 hover:bg-success/10 rounded transition-colors"
                                    data-testid={`approve-coupon-${coupon.coupon_id}`}
                                  >
                                    <CheckCircle className="w-5 h-5 text-success" />
                                  </button>
                                  <button
                                    onClick={() => handleUpdateCoupon(coupon.coupon_id, 'rejected')}
                                    className="p-1 hover:bg-error/10 rounded transition-colors"
                                    data-testid={`reject-coupon-${coupon.coupon_id}`}
                                  >
                                    <XCircle className="w-5 h-5 text-error" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="card">
              <div className="p-6 border-b border-border">
                <h2 className="text-2xl font-outfit font-bold">User Management</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="users-table">
                  <thead className="bg-background-subtle">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Wallet Balance</th>
                      <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => (
                      <tr key={u.user_id} className="hover:bg-background-subtle transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold">{u.name}</td>
                        <td className="px-6 py-4 text-sm">{u.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary uppercase">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold">${u.wallet_balance?.toFixed(2) || '0.00'}</td>
                        <td className="px-6 py-4 text-sm">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.user_id, e.target.value)}
                            className="input-field text-sm py-1"
                            data-testid={`user-role-select-${u.user_id}`}
                          >
                            <option value="buyer">Buyer</option>
                            <option value="seller">Seller</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="disputes">
            <div className="card">
              <div className="p-6 border-b border-border">
                <h2 className="text-2xl font-outfit font-bold">Dispute Management</h2>
              </div>
              
              <div className="overflow-x-auto">
                {disputes.length === 0 ? (
                  <div className="p-8 text-center text-text-secondary">No disputes found</div>
                ) : (
                  <table className="w-full" data-testid="disputes-table">
                    <thead className="bg-background-subtle">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium">Dispute ID</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Reason</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {disputes.map((dispute) => (
                        <tr key={dispute.dispute_id} className="hover:bg-background-subtle transition-colors">
                          <td className="px-6 py-4 text-sm font-mono">{dispute.dispute_id}</td>
                          <td className="px-6 py-4 text-sm">{dispute.reason}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              dispute.status === 'resolved' ? 'bg-success/10 text-success' :
                              'bg-warning/10 text-warning'
                            }`}>
                              {dispute.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {dispute.status === 'open' && (
                              <button
                                onClick={() => handleResolveDispute(dispute.dispute_id)}
                                className="btn-primary text-xs px-3 py-1"
                                data-testid={`resolve-dispute-${dispute.dispute_id}`}
                              >
                                Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;
