import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
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
  
  res.status(405).json({ error: 'Method not allowed' })
}
