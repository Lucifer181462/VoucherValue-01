import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Wallet as WalletIcon, ArrowDownToLine, DollarSign } from 'lucide-react';
import Navbar from '../components/Navbar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Wallet = ({ user }) => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [walletRes, transactionsRes] = await Promise.all([
        axios.get(`${API}/wallet`, { withCredentials: true }),
        axios.get(`${API}/transactions/my`, { withCredentials: true }),
      ]);
      setWallet(walletRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await axios.post(
        `${API}/wallet/withdraw`,
        {
          amount: parseFloat(withdrawAmount),
          upi_id: upiId,
        },
        { withCredentials: true }
      );

      toast.success('Withdrawal request submitted!');
      setOpen(false);
      setWithdrawAmount('');
      setUpiId('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-outfit font-bold mb-8" data-testid="wallet-title">Wallet</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="card p-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <WalletIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-text-secondary text-sm">Available Balance</p>
                <p className="text-4xl font-bold" data-testid="wallet-balance">${wallet?.wallet_balance?.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="btn-primary w-full mt-4" data-testid="withdraw-button">
                  <ArrowDownToLine className="w-4 h-4 inline mr-2" />
                  Withdraw Funds
                </button>
              </DialogTrigger>
              <DialogContent className="bg-background-paper border border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-outfit">Withdraw Funds</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount ($) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      required
                      min="10"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="input-field"
                      placeholder="Minimum $10"
                      data-testid="withdraw-amount-input"
                    />
                  </div>

                  <div>
                    <Label htmlFor="upi_id">UPI ID *</Label>
                    <Input
                      id="upi_id"
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="input-field"
                      placeholder="your-upi@bank"
                      data-testid="upi-id-input"
                    />
                  </div>

                  <p className="text-sm text-text-secondary">
                    Withdrawals are processed manually within 24-48 hours.
                  </p>

                  <div className="flex space-x-3">
                    <Button type="submit" disabled={submitting} className="btn-primary flex-1" data-testid="submit-withdraw-button">
                      {submitting ? 'Processing...' : 'Submit Request'}
                    </Button>
                    <Button type="button" onClick={() => setOpen(false)} variant="outline" className="btn-outline">
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="card p-8">
            <h3 className="text-xl font-outfit font-bold mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary">Total Transactions</span>
                <span className="font-semibold" data-testid="total-transactions">{transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Completed</span>
                <span className="font-semibold">
                  {transactions.filter(t => t.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">In Escrow</span>
                <span className="font-semibold">
                  {transactions.filter(t => t.status === 'escrow').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-6 border-b border-border">
            <h2 className="text-2xl font-outfit font-bold">Transaction History</h2>
          </div>

          <div className="overflow-x-auto">
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-text-secondary" data-testid="no-transactions-message">
                No transactions yet
              </div>
            ) : (
              <table className="w-full" data-testid="transactions-table">
                <thead className="bg-background-subtle">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium">Transaction ID</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((transaction) => (
                    <tr key={transaction.transaction_id} className="hover:bg-background-subtle transition-colors">
                      <td className="px-6 py-4 text-sm font-mono">{transaction.transaction_id}</td>
                      <td className="px-6 py-4 text-sm">
                        {transaction.buyer_id === user?.user_id ? 'Purchase' : 'Sale'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">${transaction.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'completed' ? 'bg-success/10 text-success' :
                          transaction.status === 'escrow' ? 'bg-warning/10 text-warning' :
                          transaction.status === 'disputed' ? 'bg-error/10 text-error' :
                          'bg-info/10 text-info'
                        }`}>
                          {transaction.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;
