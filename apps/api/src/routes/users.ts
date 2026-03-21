import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { wdkManager } from '../services/wdk/WDKManager';

const router = Router() as Router;

// Get user profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallet: {
          include: { vaults: true },
        },
        nests: {
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const { passwordHash, ...userProfile } = user;

    res.json({ user: userProfile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Create user wallet
router.post('/wallet', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check if wallet already exists
    const existingWallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (existingWallet) {
      return res.status(409).json({ error: 'Wallet already exists' });
    }

    // Create wallet via WDK
    const wallet = await wdkManager.createUserWallet(userId);

    res.status(201).json({ wallet });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create wallet' });
  }
});

export default router;
