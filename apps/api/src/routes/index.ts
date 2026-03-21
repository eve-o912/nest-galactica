import { Router } from 'express';

const router = Router() as Router;

router.get('/', (req, res) => {
  res.json({
    message: 'Nest API v1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      nests: '/api/nests',
      loans: '/api/loans',
      transactions: '/api/transactions',
      agent: '/api/agent',
    },
  });
});

export default router;
