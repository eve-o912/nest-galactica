'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface GoalsListProps {
  userId: string;
  refreshKey?: number;
  compact?: boolean;
}

interface Goal {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  priority: number;
  status: string;
  allocationPercent: number;
  deposits: any[];
  loans: any[];
}

export default function GoalsList({ userId, refreshKey, compact = false }: GoalsListProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGoals() {
      try {
        const response = await api.get(`/api/goals/${userId}`);
        setGoals(response.data.goals);
      } catch (error) {
        console.error('Failed to load goals:', error);
      } finally {
        setLoading(false);
      }
    }

    loadGoals();
  }, [userId, refreshKey]);

  if (loading) {
    return <div className="text-center py-8">Loading goals...</div>;
  }

  if (!goals.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-6xl mb-4">🎯</div>
        <p>No goals yet. Create your first goal to get started!</p>
      </div>
    );
  }

  const getGoalIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      emergency: '🚨',
      wedding: '💒',
      vacation: '✈️',
      house: '🏠',
      car: '🚗',
      education: '📚',
      retirement: '🏖️',
      other: '📌',
    };
    return icons[type] || '📌';
  };

  const getPriorityColor = (priority: number) => {
    const colors = ['text-red-600', 'text-orange-600', 'text-yellow-600', 'text-blue-600', 'text-gray-600'];
    return colors[priority - 1] || 'text-gray-600';
  };

  const getProgressBarColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {goals.map((goal) => {
        const progress = (goal.currentAmount / goal.targetAmount) * 100;
        const daysUntil = goal.deadline 
          ? Math.floor((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;

        return (
          <div key={goal.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{getGoalIcon(goal.type)}</div>
                <div>
                  <h3 className="font-semibold text-lg">{goal.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{goal.type}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-sm font-medium ${getPriorityColor(goal.priority)}`}>
                  Priority {goal.priority}
                </span>
                {goal.allocationPercent > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round(goal.allocationPercent * 100)}% allocation
                  </p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span>${goal.currentAmount.toFixed(2)} saved</span>
                <span>${goal.targetAmount.toFixed(2)} goal</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${getProgressBarColor(progress)} h-3 rounded-full transition-all duration-300`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">{Math.round(progress)}% complete</p>
            </div>

            {goal.deadline && (
              <div className="text-sm text-gray-600 mb-3">
                📅 {format(new Date(goal.deadline), 'MMM dd, yyyy')}
                {daysUntil !== null && (
                  <span className={`ml-2 font-medium ${
                    daysUntil < 30 ? 'text-red-600' : daysUntil < 90 ? 'text-yellow-600' : ''
                  }`}>
                    ({daysUntil > 0 ? `${daysUntil} days` : daysUntil === 0 ? 'Today!' : 'Overdue'})
                  </span>
                )}
              </div>
            )}

            {goal.loans.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <p className="text-sm text-yellow-800">
                  💳 {goal.loans.length} loan{goal.loans.length > 1 ? 's' : ''} available
                </p>
              </div>
            )}

            {!compact && goal.deposits.length > 0 && (
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Recent deposits:</p>
                <div className="space-y-1">
                  {goal.deposits.slice(0, 3).map((deposit) => (
                    <div key={deposit.id} className="flex justify-between">
                      <span>${deposit.amount.toFixed(2)}</span>
                      <span>{format(new Date(deposit.createdAt), 'MMM dd')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
