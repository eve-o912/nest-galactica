import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query
  
  if (req.method === 'GET') {
    // Mock yield data
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
