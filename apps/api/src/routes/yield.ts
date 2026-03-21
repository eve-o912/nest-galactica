import { Router } from 'express';
import { yoProtocol } from '@/services/yield/YOProtocolManager';
import { logger } from '@/lib/logger';
import { authMiddleware } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';

const router = Router();

// Get available YO Protocol vaults
router.get('/vaults', authMiddleware, async (req, res) => {
  try {
    const vaults = await yoProtocol.getAvailableVaults();
    res.json({ success: true, data: vaults });
  } catch (error) {
    logger.error('Failed to fetch YO vaults', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch vaults' });
  }
});

// Get user's yield earnings
router.get('/earnings/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
    const earnings = await yoProtocol.calculateEarnings(userId);
    res.json({ success: true, data: earnings });
  } catch (error) {
    logger.error('Failed to calculate earnings', { userId: Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId, error });
    res.status(500).json({ success: false, error: 'Failed to calculate earnings' });
  }
});

// Deposit to YO Protocol
router.post('/deposit', authMiddleware, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ success: false, error: 'Missing userId or amount' });
    }
    
    if (amount < 100) {
      return res.status(400).json({ success: false, error: 'Minimum deposit is $100' });
    }
    
    // Get user's wallet address
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.walletAddress) {
      return res.status(400).json({ success: false, error: 'User wallet not found' });
    }
    
    const result = await yoProtocol.depositUSDC(userId, user.walletAddress, amount);
    
    logger.info('YO Protocol deposit completed', { userId, amount, txHash: result.txHash });
    
    res.json({ 
      success: true, 
      data: {
        ...result,
        message: `Successfully deposited $${amount} USDC to YO Protocol`
      }
    });
  } catch (error) {
    logger.error('YO deposit failed', { userId: req.body.userId, error });
    res.status(500).json({ success: false, error: 'Deposit failed' });
  }
});

// Withdraw from YO Protocol
router.post('/withdraw', authMiddleware, async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({ success: false, error: 'Missing userId or amount' });
    }
    
    // Get user's wallet address
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.walletAddress) {
      return res.status(400).json({ success: false, error: 'User wallet not found' });
    }
    
    const result = await yoProtocol.withdrawUSDC(userId, user.walletAddress, amount);
    
    logger.info('YO Protocol withdrawal completed', { userId, amount, txHash: result.txHash });
    
    res.json({ 
      success: true, 
      data: {
        ...result,
        message: `Successfully withdrew $${amount} USDC from YO Protocol`
      }
    });
  } catch (error) {
    logger.error('YO withdrawal failed', { userId: req.body.userId, error });
    res.status(500).json({ success: false, error: 'Withdrawal failed' });
  }
});

export default router;
