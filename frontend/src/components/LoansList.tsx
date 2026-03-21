'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { format } from 'date-fns';

interface LoansListProps {
  userId: string;
  refreshKey?: number;
}

interface Loan {
  id: string;
  amount: number;
  apr: number;
  durationMonths: number;
  monthlyPayment: number;
  totalInstallments: number;
  paidInstallments: number;
  status: string;
  riskScore?: number;
  offeredAt?: string;
  acceptedAt?: string;
  disbursedAt?: string;
  repaidAt?: string;
  collateralAmount?: number;
  collateralLocked: boolean;
  goal: {
    id: string;
    name: string;
    type: string;
  };
  repayments: any[];
}

export default function LoansList({ userId, refreshKey }: LoansListProps) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLoans() {
      try {
        const response = await api.get(`/api/loans/${userId}`);
        setLoans(response.data.loans);
      } catch (error) {
        console.error('Failed to load loans:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLoans();
  }, [userId, refreshKey]);

  const handleAcceptLoan = async (loanId: string) => {
    try {
      await api.post(`/api/loans/${loanId}/accept`);
      // Refresh the loans list
      const response = await api.get(`/api/loans/${userId}`);
      setLoans(response.data.loans);
    } catch (error) {
      console.error('Failed to accept loan:', error);
      alert('Failed to accept loan. Please try again.');
    }
  };

  const handleRepayLoan = async (loanId: string, installmentNumber: number) => {
    try {
      await api.post(`/api/loans/${loanId}/repay`, { installmentNumber });
      // Refresh the loans list
      const response = await api.get(`/api/loans/${userId}`);
      setLoans(response.data.loans);
    } catch (error) {
      console.error('Failed to repay loan:', error);
      alert('Failed to process repayment. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading loans...</div>;
  }

  if (!loans.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-6xl mb-4">💳</div>
        <p>No loans yet. Your AI advisor will offer bridge loans when goals need them.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      offered: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      repaid: 'bg-gray-100 text-gray-800',
      defaulted: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRiskColor = (riskScore?: number) => {
    if (!riskScore) return '';
    if (riskScore <= 3) return 'text-green-600';
    if (riskScore <= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {loans.map((loan) => {
        const progress = (loan.paidInstallments / loan.totalInstallments) * 100;
        const nextRepayment = loan.repayments.find(r => r.status === 'scheduled');

        return (
          <div key={loan.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-lg">Bridge Loan</h3>
                <p className="text-sm text-gray-600">For: {loan.goal.name} ({loan.goal.type})</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                  {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                </span>
                {loan.riskScore && (
                  <p className={`text-sm mt-1 ${getRiskColor(loan.riskScore)}`}>
                    Risk Score: {loan.riskScore}/10
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-semibold">${loan.amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">APR</p>
                <p className="font-semibold">{(loan.apr * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly</p>
                <p className="font-semibold">${loan.monthlyPayment.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Term</p>
                <p className="font-semibold">{loan.durationMonths} months</p>
              </div>
            </div>

            {loan.status === 'offered' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 mb-3">
                  🔔 Bridge loan offered to help reach your goal faster!
                </p>
                <button
                  onClick={() => handleAcceptLoan(loan.id)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition"
                >
                  Accept Loan
                </button>
              </div>
            )}

            {loan.status === 'active' && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress: {loan.paidInstallments}/{loan.totalInstallments} payments</span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {nextRepayment && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-blue-800">Next Payment Due</p>
                        <p className="text-sm text-blue-600">
                          ${nextRepayment.amount.toFixed(2)} - {format(new Date(nextRepayment.dueDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRepayLoan(loan.id, nextRepayment.installmentNumber)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                      >
                        Pay Now
                      </button>
                    </div>
                  </div>
                )}

                {loan.collateralLocked && loan.collateralAmount && (
                  <div className="text-sm text-gray-600">
                    🔒 ${loan.collateralAmount.toFixed(2)} collateral locked
                  </div>
                )}
              </div>
            )}

            {loan.status === 'repaid' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  ✅ Loan fully repaid on {loan.repaidAt ? format(new Date(loan.repaidAt), 'MMM dd, yyyy') : 'N/A'}
                </p>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-4 space-y-1">
              {loan.offeredAt && <p>Offered: {format(new Date(loan.offeredAt), 'MMM dd, yyyy')}</p>}
              {loan.acceptedAt && <p>Accepted: {format(new Date(loan.acceptedAt), 'MMM dd, yyyy')}</p>}
              {loan.disbursedAt && <p>Disbursed: {format(new Date(loan.disbursedAt), 'MMM dd, yyyy')}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
