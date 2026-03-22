import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({
      earnings: {
        total: '45.67',
        monthly: '12.34'
      }
    })
    return
  }
  
  res.status(405).json({ error: 'Method not allowed' })
}
