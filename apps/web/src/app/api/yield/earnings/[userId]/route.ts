import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // Mock yield data
  return NextResponse.json({
    earnings: {
      total: '45.67',
      monthly: '12.34'
    }
  })
}
