import { NextApiRequest, NextApiResponse } from 'next'

// This is a simple proxy that forwards requests to the actual API
// For now, let's return mock data to get the frontend working

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req
  
  if (method === 'GET' && query.path && query.path[0] === 'nests') {
    // Mock nests data
    res.status(200).json({
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
    return
  }
  
  if (method === 'GET' && query.path && query.path[0] === 'loans') {
    // Mock loans data
    res.status(200).json({
      loans: []
    })
    return
  }
  
  if (method === 'GET' && query.path && query.path[0] === 'yield' && query.path[1] === 'earnings') {
    // Mock yield data
    res.status(200).json({
      earnings: {
        total: '45.67',
        monthly: '12.34'
      }
    })
    return
  }
  
  res.status(404).json({ error: 'API endpoint not found' })
}
