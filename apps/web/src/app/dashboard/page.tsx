'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(false)
  }, [])

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

        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold mb-4">Welcome to Nest</h2>
          <p className="text-gray-600">Your financial dashboard is ready!</p>
        </div>
      </div>
    </div>
  )
}
