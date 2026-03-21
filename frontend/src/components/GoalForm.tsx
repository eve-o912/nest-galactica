'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

interface GoalFormProps {
  onSuccess: () => void;
  compact?: boolean;
}

export default function GoalForm({ onSuccess, compact = false }: GoalFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'other',
    targetAmount: '',
    deadline: '',
  });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(compact);

  const goalTypes = [
    { value: 'emergency', label: '🚨 Emergency Fund', description: '3-6 months expenses' },
    { value: 'wedding', label: '💒 Wedding', description: 'Special day fund' },
    { value: 'vacation', label: '✈️ Vacation', description: 'Travel and leisure' },
    { value: 'house', label: '🏠 House', description: 'Down payment fund' },
    { value: 'car', label: '🚗 Car', description: 'Vehicle purchase' },
    { value: 'education', label: '📚 Education', description: 'Learning and courses' },
    { value: 'retirement', label: '🏖️ Retirement', description: 'Long-term savings' },
    { value: 'other', label: '📌 Other', description: 'Custom goal' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.targetAmount || parseFloat(formData.targetAmount) <= 0) return;

    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) throw new Error('User not logged in');

      await api.post('/api/goals', {
        userId,
        name: formData.name,
        type: formData.type,
        targetAmount: parseFloat(formData.targetAmount),
        deadline: formData.deadline || null,
      });

      setFormData({ name: '', type: 'other', targetAmount: '', deadline: '' });
      setShowForm(false);
      onSuccess();
      alert('Goal created successfully! Your AI advisor will help you reach it.');
    } catch (error) {
      console.error('Goal creation failed:', error);
      alert('Failed to create goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (compact && !showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg transition font-medium"
      >
        ➕ Create New Goal
      </button>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${compact ? '' : 'w-full'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`font-semibold ${compact ? 'text-lg' : 'text-xl'}`}>
          🎯 {compact ? 'New Goal' : 'Create a New Goal'}
        </h3>
        {compact && (
          <button
            onClick={() => setShowForm(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Goal Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Emergency Fund, Dream Vacation"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Goal Type
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          >
            {goalTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Amount ($)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
            <input
              type="number"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={loading}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Date (Optional)
          </label>
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={loading}
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={!formData.name || !formData.targetAmount || parseFloat(formData.targetAmount) <= 0 || loading}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-2 rounded-lg transition font-medium"
          >
            {loading ? 'Creating...' : 'Create Goal'}
          </button>
          {compact && (
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {!compact && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            💡 <strong>AI-Powered:</strong> Your goal will automatically get smart allocation recommendations and bridge loan offers when needed.
          </p>
        </div>
      )}
    </div>
  );
}
