'use client';
import { useState } from 'react';
import { api, getUserId } from '@/lib/api';
import GoalsList from './GoalsList';
import LoansList from './LoansList';
import ChatInterface from './ChatInterface';
import DepositForm from './DepositForm';
import GoalForm from './GoalForm';

interface DashboardProps {
  user: any;
}

export default function Dashboard({ user }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const userId = getUserId();

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const totalSaved = user.goals?.reduce((sum: number, goal: any) => sum + goal.currentAmount, 0) || 0;
  const totalTarget = user.goals?.reduce((sum: number, goal: any) => sum + goal.targetAmount, 0) || 0;
  const activeLoans = user.loans?.filter((loan: any) => loan.status === 'active') || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user.name || 'User'}! 👋</h1>
              <p className="text-purple-100 mt-1">Your AI-powered financial dashboard</p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('userId');
                window.location.href = '/';
              }}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Saved</p>
                <p className="text-3xl font-bold text-gray-900">${totalSaved.toFixed(2)}</p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Goal Progress</p>
                <p className="text-3xl font-bold text-gray-900">
                  {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
                </p>
              </div>
              <div className="text-4xl">🎯</div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Loans</p>
                <p className="text-3xl font-bold text-gray-900">{activeLoans.length}</p>
              </div>
              <div className="text-4xl">💳</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            {['overview', 'goals', 'deposits', 'loans', 'chat'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DepositForm onSuccess={handleRefresh} />
                  <GoalForm onSuccess={handleRefresh} />
                </div>
              </div>
              
              <div>
                <h2 className="text-xl font-semibold mb-4">Recent Goals</h2>
                <GoalsList userId={userId!} refreshKey={refreshKey} compact />
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Your Goals</h2>
                <GoalForm onSuccess={handleRefresh} />
              </div>
              <GoalsList userId={userId!} refreshKey={refreshKey} />
            </div>
          )}

          {activeTab === 'deposits' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Make a Deposit</h2>
              <DepositForm onSuccess={handleRefresh} />
            </div>
          )}

          {activeTab === 'loans' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Your Loans</h2>
              <LoansList userId={userId!} refreshKey={refreshKey} />
            </div>
          )}

          {activeTab === 'chat' && (
            <div>
              <h2 className="text-xl font-semibold mb-6">AI Financial Advisor</h2>
              <ChatInterface userId={userId!} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
