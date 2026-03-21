import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query, method } = req
  
  if (method === 'GET' && query.route === 'nests') {
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
  
  if (method === 'GET' && query.route === 'loans') {
    res.status(200).json({
      loans: []
    })
    return
  }
  
  if (method === 'GET' && query.route === 'yield') {
    res.status(200).json({
      earnings: {
        total: '45.67',
        monthly: '12.34'
      }
    })
    return
  }
  
  res.status(404).json({ error: 'Not found' })
}
