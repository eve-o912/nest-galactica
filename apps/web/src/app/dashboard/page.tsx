'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Nest {
  id: string
  name: string
  type: string
  targetAmount: string
  currentAmount: string
  deadline?: string
  priority: number
}

interface Loan {
  id: string
  amount: string
  apr: string
  status: string
  nest?: { name: string }
}

export default function Dashboard() {
  const [nests, setNests] = useState<Nest[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [yieldEarnings, setYieldEarnings] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          window.location.href = '/auth/login'
          return
        }

        const [nestsResponse, loansResponse, yieldResponse] = await Promise.all([
          fetch('/api/index?route=nests', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/index?route=loans', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/index?route=yield', {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ ok: true, json: () => ({ earnings: null }) }))
        ])

        if (nestsResponse.ok) {
          const nestsData = await nestsResponse.json()
          setNests(nestsData.nests || [])
        }

        if (loansResponse.ok) {
          const loansData = await loansResponse.json()
          setLoans(loansData.loans || [])
        }

        if (yieldResponse.ok) {
          const yieldData = await yieldResponse.json()
          setYieldEarnings(yieldData.earnings)
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const totalSavings = nests.reduce((sum, nest) => sum + parseFloat(nest.currentAmount), 0)
  const totalGoals = nests.reduce((sum, nest) => sum + parseFloat(nest.targetAmount), 0)
  const savingsProgress = totalGoals > 0 ? (totalSavings / totalGoals) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Nest Dashboard</h1>
          <div className="flex gap-4">
            <Link href="/nests/create">
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Nest</button>
            </Link>
            <Link href="/advisor">
              <button className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-100">Chat with AI</button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Savings</h3>
            <div className="text-2xl font-bold">${totalSavings.toFixed(2)}</div>
            <p className="text-xs text-gray-500">Across {nests.length} nests</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Goal Progress</h3>
            <div className="text-2xl font-bold">{savingsProgress.toFixed(1)}%</div>
            <p className="text-xs text-gray-500">${totalGoals.toFixed(2)} total target</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Active Loans</h3>
            <div className="text-2xl font-bold">{loans.filter(l => l.status === 'ACTIVE').length}</div>
            <p className="text-xs text-gray-500">Total {loans.length} loans</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Yield Earnings</h3>
            <div className="text-2xl font-bold">${yieldEarnings?.total || '0.00'}</div>
            <p className="text-xs text-gray-500">This month</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Your Nests</h2>
          </div>
          <div className="p-6">
            {nests.length === 0 ? (
              <p className="text-gray-500">No nests yet. Create your first nest to start saving!</p>
            ) : (
              <div className="space-y-4">
                {nests.map((nest) => (
                  <div key={nest.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{nest.name}</h3>
                        <p className="text-sm text-gray-600">{nest.type}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${nest.currentAmount}</div>
                        <div className="text-sm text-gray-600">of ${nest.targetAmount}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Your Loans</h2>
          </div>
          <div className="p-6">
            {loans.length === 0 ? (
              <p className="text-gray-500">No loans yet.</p>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => (
                  <div key={loan.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{loan.nest?.name || 'General Loan'}</h3>
                        <p className="text-sm text-gray-600">APR: {loan.apr}%</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${loan.amount}</div>
                        <div className={`text-sm ${loan.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-600'}`}>
                          {loan.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
