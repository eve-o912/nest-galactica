'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
          fetch('/api/nests', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/loans', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('/api/yield/earnings/user123', {
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ ok: true, json: () => ({ earnings: null }) })
        ])

        if (nestsResponse.ok) {
          const nestsData = await nestsResponse.json()
          setNests(nestsData.nests)
        }

        if (loansResponse.ok) {
          const loansData = await loansResponse.json()
          setLoans(loansData.loans)
        }

        if (yieldResponse.ok) {
          const yieldData = await yieldResponse.json()
          setYieldEarnings(yieldData.earnings)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Nest Dashboard</h1>
          <div className="flex gap-4">
            <Link href="/nests/create">
              <Button>Create Nest</Button>
            </Link>
            <Link href="/advisor">
              <Button variant="outline">Chat with AI</Button>
            </Link>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalSavings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Across {nests.length} nests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Goal Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{savingsProgress.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                ${totalGoals.toFixed(2)} total target
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loans.filter(loan => loan.status === 'ACTIVE').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {loans.filter(loan => loan.status === 'OFFERED').length} pending offers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                AI Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <p className="text-xs text-muted-foreground">
                Managing your finances
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Nests Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Nests</h2>
          {nests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground mb-4">No nests created yet</p>
                <Link href="/nests/create">
                  <Button>Create Your First Nest</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nests.map((nest) => {
                const progress = (parseFloat(nest.currentAmount) / parseFloat(nest.targetAmount)) * 100
                return (
                  <Card key={nest.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {nest.name}
                        <span className="text-sm font-normal text-muted-foreground">
                          Priority {nest.priority}
                        </span>
                      </CardTitle>
                      <CardDescription>{nest.type}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Progress</span>
                            <span>{progress.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>${nest.currentAmount}</span>
                          <span>${nest.targetAmount}</span>
                        </div>
                        {nest.deadline && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(nest.deadline).toLocaleDateString()}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Link href={`/nests/${nest.id}`}>
                            <Button variant="outline" size="sm" className="flex-1">
                              View
                            </Button>
                          </Link>
                          <Button size="sm" className="flex-1">
                            Add Funds
                          </Button>
                        </div>
                      </div>
                    </CardContent>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savingsProgress.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              ${totalGoals.toFixed(2)} total target
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loans.filter(loan => loan.status === 'ACTIVE').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {loans.filter(loan => loan.status === 'OFFERED').length} pending offers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              AI Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              Managing your finances
            </p>
          </CardContent>
        </Card>
      </div>

      {/* YO Protocol Earnings */}
      {yieldEarnings && yieldEarnings.totalDeposited > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-lg p-6 border-2 border-green-300">
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
                  ${(yieldEarnings.effectiveAPY * 100).toFixed(2)}%
                </div>
              </div>
            </div>
            
            <div className="text-xs text-green-700">
              🔒 Powered by YO Protocol • Audited by Trail of Bits • Base Chain
            </div>
          </div>
        </div>
      )}

      {/* Nests Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Nests</h2>
        {nests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">No nests created yet</p>
              <Link href="/nests/create">
                <Button>Create Your First Nest</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nests.map((nest) => {
              const progress = (parseFloat(nest.currentAmount) / parseFloat(nest.targetAmount)) * 100
              return (
                <Card key={nest.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {nest.name}
                      <span className="text-sm font-normal text-muted-foreground">
                        Priority {nest.priority}
                      </span>
                    </CardTitle>
                    <CardDescription>{nest.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
              {loans.map((loan) => (
                <Card key={loan.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {loan.nest?.name || 'General Loan'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          ${loan.amount} at {(parseFloat(loan.apr) * 100).toFixed(1)}% APR
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          loan.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          loan.status === 'OFFERED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {loan.status.replace('_', ' ')}
                        </span>
                        {loan.status === 'OFFERED' && (
                          <div className="mt-2">
                            <Link href={`/loans/${loan.id}`}>
                              <Button size="sm">Review Offer</Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
