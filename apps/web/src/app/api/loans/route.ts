import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Mock loans data
  return NextResponse.json({
    loans: []
  })
}
