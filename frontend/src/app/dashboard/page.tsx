'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getUserId } from '@/lib/api';

interface Goal {
  id: string;
  name: string;
  type: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  priority: number;
  allocationPercent: number;
  deposits: any[];
  loans: any[];
}

interface Loan {
  id: string;
  amount: number;
  apr: number;
  monthlyPayment: number;
  status: string;
  goal: Goal;
  paidInstallments: number;
  totalInstallments: number;
  repayments: any[];
}

interface YieldEarnings {
  totalDeposited: number;
  currentValue: number;
  unrealizedGains: number;
  effectiveAPY: number;
  positions: Array<{
    vaultName: string;
    deposited: number;
    shares: string;
    currentValue: number;
    earnings: number;
  }>;
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [yieldEarnings, setYieldEarnings] = useState<YieldEarnings | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    const userId = getUserId();
    if (!userId) {
      router.push('/');
      return;
    }

    try {
      const [dashboardData, yoData] = await Promise.all([
        api.get(`/api/dashboard/${userId}`),
        api.get(`/api/yo/earnings/${userId}`).catch(() => ({ data: { earnings: null } })),
      ]);
      
      setUser(dashboardData.data.user);
      setGoals(dashboardData.data.user.goals || []);
      setLoans(dashboardData.data.user.loans || []);
      setYieldEarnings(yoData.data.earnings);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      router.push('/');
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-400">Loading...</div>
      </div>
    );
  }

  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🏡</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nest</h1>
              <p className="text-sm text-gray-500">Welcome back, {user.name || user.email}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/chat')}
              className="bg-purple-600 text-white px-5 py-2.5 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
            >
              <span>💬</span>
              <span>Chat with AI</span>
            </button>
            
            <button
              onClick={() => {
                localStorage.removeItem('userId');
                router.push('/');
              }}
              className="text-gray-600 hover:text-gray-800 px-4"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Total Saved</div>
            <div className="text-3xl font-bold text-gray-900">
              ${totalSaved.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              of ${totalTarget.toFixed(2)} goal
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Active Goals</div>
            <div className="text-3xl font-bold text-gray-900">
              {goals.length}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {goals.filter(g => (g.currentAmount / g.targetAmount) >= 1).length} completed
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Active Loans</div>
            <div className="text-3xl font-bold text-gray-900">
              {loans.length}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {loans.filter(l => l.status === 'offered').length} pending offers
            </div>
          </div>
        </div>

        {/* YO Protocol Earnings */}
        {yieldEarnings && yieldEarnings.totalDeposited > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-lg p-6 mb-8 border-2 border-green-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-5xl">📈</div>
              <div>
                <h3 className="text-2xl font-bold text-green-900">YO Protocol Earnings</h3>
                <p className="text-sm text-green-700">Your funds are earning yield on Base</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Deposited</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${yieldEarnings.totalDeposited.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Current Value</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${yieldEarnings.currentValue.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Earnings</div>
                <div className="text-2xl font-bold text-green-600">
                  +${yieldEarnings.unrealizedGains.toFixed(2)}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">APY</div>
                <div className="text-2xl font-bold text-green-600">
                  {(yieldEarnings.effectiveAPY * 100).toFixed(2)}%
                </div>
              </div>
            </div>
            
            <div className="text-xs text-green-700">
              🔒 Powered by YO Protocol • Audited by Trail of Bits • Base Chain
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowDeposit(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition font-semibold flex items-center gap-2"
          >
            <span>💰</span>
            <span>Deposit USD₮</span>
          </button>
          
          <button
            onClick={() => setShowAddGoal(true)}
            className="bg-white text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-semibold border border-gray-300 flex items-center gap-2"
          >
            <span>🎯</span>
            <span>Add New Goal</span>
          </button>
        </div>

        {/* Goals Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Nests</h2>
          
          {goals.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-gray-500 mb-4">No goals yet. Start building your financial nest!</p>
              <button
                onClick={() => setShowAddGoal(true)}
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
              >
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onUpdate={loadDashboard} />
              ))}
            </div>
          )}
        </div>

        {/* Loan Offers */}
        {loans.filter(l => l.status === 'offered').length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">💡 Bridge Loan Offers</h2>
            <div className="space-y-4">
              {loans
                .filter(l => l.status === 'offered')
                .map((loan) => (
                  <LoanOfferCard key={loan.id} loan={loan} onUpdate={loadDashboard} />
                ))}
            </div>
          </div>
        )}

        {/* Active Loans */}
        {loans.filter(l => l.status === 'active').length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4">📊 Active Loans</h2>
            <div className="space-y-4">
              {loans
                .filter(l => l.status === 'active')
                .map((loan) => (
                  <ActiveLoanCard key={loan.id} loan={loan} onUpdate={loadDashboard} />
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <AddGoalModal
          userId={user.id}
          onClose={() => setShowAddGoal(false)}
          onSuccess={() => {
            setShowAddGoal(false);
            loadDashboard();
          }}
        />
      )}

      {/* Deposit Modal */}
      {showDeposit && (
        <DepositModal
          userId={user.id}
          onClose={() => setShowDeposit(false)}
          onSuccess={() => {
            setShowDeposit(false);
            loadDashboard();
          }}
        />
      )}
    }

// ============================================================================
// GOAL CARD COMPONENT
// ============================================================================

function GoalCard({ goal, onUpdate }: { goal: Goal; onUpdate: () => void }) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const isComplete = progress >= 100;
  
  const icons: Record<string, string> = {
    emergency: '🛡️',
    wedding: '💍',
    vacation: '✈️',
    house: '🏠',
    education: '🎓',
    car: '🚗',
    business: '💼',
  };
  
  const icon = icons[goal.type] || '🎯';
  
  const progressColor = 
    progress < 30 ? 'bg-red-500' :
    progress < 70 ? 'bg-blue-500' :
    progress < 100 ? 'bg-yellow-500' :
    'bg-green-500';

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{icon}</div>
          <div>
            <h3 className="font-bold text-lg">{goal.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{goal.type} nest</p>
          </div>
        </div>
        
        {goal.loans.length > 0 && (
          <div className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">
            Has Loan
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold">{Math.min(progress, 100).toFixed(0)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`${progressColor} h-3 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <div className="text-2xl font-bold">
            ${goal.currentAmount.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            of ${goal.targetAmount.toFixed(2)}
          </div>
        </div>
        
        {goal.deadline && (
          <div className="text-right">
            <div className="text-xs text-gray-500">Deadline</div>
            <div className="text-sm font-semibold">
              {new Date(goal.deadline).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>

      {goal.allocationPercent > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="text-xs text-gray-500">Auto-allocation</div>
          <div className="text-sm font-semibold">
            {(goal.allocationPercent * 100).toFixed(0)}% of deposits
          </div>
        </div>
      )}

      {isComplete && (
        <div className="mt-4 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold text-center">
          🎉 Goal Complete!
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LOAN OFFER CARD
// ============================================================================

function LoanOfferCard({ loan, onUpdate }: { loan: Loan; onUpdate: () => void }) {
  const [accepting, setAccepting] = useState(false);

  async function handleAccept() {
    if (!confirm(`Accept loan offer of $${loan.amount} at ${(loan.apr * 100).toFixed(1)}% APR?`)) {
      return;
    }

    setAccepting(true);
    try {
      await api.post(`/api/loans/${loan.id}/accept`);
      alert('Loan accepted! Funds disbursed to your goal.');
      onUpdate();
    } catch (error) {
      alert('Failed to accept loan');
    } finally {
      setAccepting(false);
    }
  }

  const totalCost = loan.monthlyPayment * loan.totalInstallments;
  const interestCost = totalCost - loan.amount;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm text-purple-600 font-semibold mb-1">
            🤖 AI Agent Recommendation
          </div>
          <h3 className="text-xl font-bold">Bridge Loan Available</h3>
          <p className="text-gray-600">For: {loan.goal.name}</p>
        </div>
        
        <div className="text-right">
          <div className="text-3xl font-bold text-purple-600">
            ${loan.amount.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">
            {(loan.apr * 100).toFixed(1)}% APR
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 mb-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Monthly Payment:</span>
          <span className="font-semibold">${loan.monthlyPayment.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Duration:</span>
          <span className="font-semibold">{loan.totalInstallments} months</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Repayment:</span>
          <span className="font-semibold">${totalCost.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Interest Cost:</span>
          <span className="font-semibold text-purple-600">${interestCost.toFixed(2)}</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="text-sm text-blue-800">
          <strong>Why this loan?</strong> Your {loan.goal.name} goal is approaching its deadline.
          This bridge loan will help you reach your target on time. Your existing savings will
          serve as collateral.
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition font-semibold disabled:opacity-50"
        >
          {accepting ? 'Processing...' : 'Accept Loan'}
        </button>
        
        <button
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          onClick={() => alert('Loan declined')}
        >
          Decline
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// ACTIVE LOAN CARD
// ============================================================================

function ActiveLoanCard({ loan, onUpdate }: { loan: Loan; onUpdate: () => void }) {
  const [repaying, setRepaying] = useState(false);
  
  const progress = (loan.paidInstallments / loan.totalInstallments) * 100;
  const remaining = loan.amount - (loan.paidInstallments * loan.monthlyPayment);
  const nextPayment = loan.repayments[0];

  async function handleRepayment() {
    if (!confirm(`Make payment of $${loan.monthlyPayment.toFixed(2)}?`)) {
      return;
    }

    setRepaying(true);
    try {
      await api.post(`/api/loans/${loan.id}/repay`, {
        installmentNumber: loan.paidInstallments + 1,
      });
      alert('Payment processed successfully!');
      onUpdate();
    } catch (error) {
      alert('Payment failed');
    } finally {
      setRepaying(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold">{loan.goal.name} Loan</h3>
          <p className="text-sm text-gray-500">
            {loan.paidInstallments} of {loan.totalInstallments} payments made
          </p>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold">${remaining.toFixed(2)}</div>
          <div className="text-sm text-gray-500">remaining</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Progress</span>
          <span className="font-semibold">{progress.toFixed(0)}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {nextPayment && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-sm text-gray-600 mb-2">Next Payment Due</div>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xl font-bold">
                ${loan.monthlyPayment.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">
                Due: {new Date(nextPayment.dueDate).toLocaleDateString()}
              </div>
            </div>
            
            <button
              onClick={handleRepayment}
              disabled={repaying}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {repaying ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ADD GOAL MODAL
// ============================================================================

function AddGoalModal({ userId, onClose, onSuccess }: any) {
  const [name, setName] = useState('');
  const [type, setType] = useState('emergency');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name || !targetAmount) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/goals', {
        userId,
        name,
        type,
        targetAmount: parseFloat(targetAmount),
        deadline: deadline || null,
      });
      
      onSuccess();
    } catch (error) {
      alert('Failed to create goal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6">Create New Goal</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Goal Name</label>
            <input
              type="text"
              placeholder="e.g., Emergency Fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">Goal Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="emergency">🛡️ Emergency Fund</option>
              <option value="wedding">💍 Wedding</option>
              <option value="vacation">✈️ Vacation</option>
              <option value="house">🏠 House</option>
              <option value="education">🎓 Education</option>
              <option value="car">🚗 Car</option>
              <option value="business">💼 Business</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">Target Amount ($)</label>
            <input
              type="number"
              placeholder="5000"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">Deadline (Optional)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 font-semibold"
          >
            {loading ? 'Creating...' : 'Create Goal'}
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DEPOSIT MODAL
// ============================================================================

function DepositModal({ userId, onClose, onSuccess }: any) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleDeposit() {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/deposit', {
        userId,
        amount: parseFloat(amount),
      });
      
      alert(`Deposit successful! Funds allocated across your goals:\n${response.data.allocations.map((a: any) => `$${a.amount.toFixed(2)}`).join(', ')}`);
      onSuccess();
    } catch (error) {
      alert('Deposit failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-2">Deposit USD₮</h2>
        <p className="text-gray-600 mb-6">
          Funds will be automatically allocated across your goals based on priorities
        </p>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">Amount (USD₮)</label>
          <input
            type="number"
            placeholder="1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleDeposit()}
            className="w-full p-4 border rounded-lg text-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-blue-800">
            💡 <strong>Smart Allocation:</strong> Our AI agent will distribute your deposit
            across goals based on their priority, deadline, and progress. Emergency fund gets
            highest allocation.
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleDeposit}
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-semibold"
          >
            {loading ? 'Processing...' : 'Deposit Now'}
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
