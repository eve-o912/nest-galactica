'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

interface DepositFormProps {
  onSuccess: () => void;
  compact?: boolean;
}

export default function DepositForm({ onSuccess, compact = false }: DepositFormProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not logged in');

      await api.post('/api/deposit', {
        userId,
        amount: parseFloat(amount),
      });

      setAmount('');
      onSuccess();
      alert('Deposit successful! Funds have been allocated to your goals.');
    } catch (error) {
      console.error('Deposit failed:', error);
      alert('Deposit failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = [50, 100, 250, 500, 1000];

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${compact ? '' : 'w-full'}`}>
      <h3 className={`font-semibold mb-4 ${compact ? 'text-lg' : 'text-xl'}`}>💰 Make a Deposit</h3>
      
      <form onSubmit={handleDeposit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
            />
          </div>
        </div>

        {!compact && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Quick amounts:</p>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  type="button"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-lg text-sm transition"
                  disabled={loading}
                >
                  ${quickAmount}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!amount || parseFloat(amount) <= 0 || loading}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-2 rounded-lg transition font-medium"
        >
          {loading ? 'Processing...' : 'Deposit Now'}
        </button>
      </form>

      {!compact && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Smart Allocation:</strong> Your deposit will be automatically distributed across goals based on your AI advisor's recommendations.
          </p>
        </div>
      )}
    </div>
  );
}
