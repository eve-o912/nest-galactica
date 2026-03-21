import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Mock nests data
  return NextResponse.json({
    nests: [
      {
        id: '1',
        name: 'Emergency Fund',
        type: 'EMERGENCY',
        targetAmount: '10000',
        currentAmount: '2500',
        priority: 1
      },
      {
        id: '2', 
        name: 'Vacation Fund',
        type: 'GOAL',
        targetAmount: '5000',
        currentAmount: '1200',
        priority: 2
      }
    ]
  })
}
