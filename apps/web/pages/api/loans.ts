import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({
      loans: []
    })
    return
  }
  
  res.status(405).json({ error: 'Method not allowed' })
}
