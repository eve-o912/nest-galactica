import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Mock loans data
    res.status(200).json({
      loans: []
    })
    return
  }
  
  res.status(405).json({ error: 'Method not allowed' })
}
