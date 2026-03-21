// Simple API handler for Vercel serverless
export default function handler(req, res) {
  const { url, method } = req
  
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  if (url === '/api/nests' && method === 'GET') {
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
  
  if (url === '/api/loans' && method === 'GET') {
    res.status(200).json({
      loans: []
    })
    return
  }
  
  if (url.includes('/api/yield/earnings/') && method === 'GET') {
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
