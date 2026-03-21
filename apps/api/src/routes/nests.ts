import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { wdkManager } from '../services/wdk/WDKManager';
import { agentScheduler } from '../services/agent/AgentScheduler';

const router = Router() as Router;

// Validation schemas
const createNestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  type: z.enum([
    'EMERGENCY',
    'WEDDING',
    'VACATION',
    'HOUSE',
    'EDUCATION',
    'CAR',
    'BUSINESS',
    'CUSTOM',
  ]),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  deadline: z.string().datetime().optional(),
});

// Create nest
router.post(
  '/',
  authenticate,
  validate(createNestSchema),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, description, type, targetAmount, deadline } = req.body;
      const userId = req.user!.id;

      // Determine priority
      let priority = 3;
      if (type === 'EMERGENCY') priority = 1;
      else if (deadline) {
        const daysUntil = Math.floor(
          (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil < 90) priority = 2;
      }

      const nest = await prisma.nest.create({
        data: {
          userId,
          name,
          description,
          type,
          targetAmount,
          deadline: deadline ? new Date(deadline) : null,
          priority,
        },
      });

      // Trigger agent to recalculate allocations
      await agentScheduler.scheduleUser(userId);

      res.status(201).json({ nest });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create nest' });
    }
  }
);

// Get user's nests
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const nests = await prisma.nest.findMany({
      where: { userId },
      include: {
        vaults: true,
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { priority: 'asc' },
    });

    res.json({ nests });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nests' });
  }
});

// Deposit to nest (triggers auto-allocation)
router.post('/:nestId/deposit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { nestId } = req.params;
    const { amount } = req.body;
    const userId = req.user!.id;

    // Verify nest ownership
    const nest = await prisma.nest.findFirst({
      where: { id: nestId, userId },
    });

    if (!nest) {
      return res.status(404).json({ error: 'Nest not found' });
    }

    // Process through WDK (auto-allocates across nests)
    const transactions = await wdkManager.handleDeposit(
      userId,
      amount,
      'USDT'
    );

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ error: 'Deposit failed' });
  }
});

export default router;
