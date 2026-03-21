import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { wdkManager } from '../services/wdk/WDKManager';

const router = Router() as Router;

// Validation schemas
const acceptLoanSchema = z.object({
  accept: z.boolean(),
});

// Get user's loans
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const loans = await prisma.loan.findMany({
      where: { userId },
      include: {
        nest: true,
        repaymentSchedule: {
          orderBy: { dueDate: 'asc' },
        },
        collateral: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ loans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Accept/reject loan offer
router.post('/:loanId/respond', authenticate, validate(acceptLoanSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { loanId } = req.params;
    const { accept } = req.body;
    const userId = req.user!.id;

    const loan = await prisma.loan.findFirst({
      where: { id: loanId, userId, status: 'OFFERED' },
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan offer not found' });
    }

    if (accept) {
      // Accept loan - create collateral and disburse funds
      const collateralAmount = (parseFloat(Array.isArray(loan.amount) ? loan.amount[0] : loan.amount) * 1.2).toFixed(2); // 120% collateral
      
      // Create collateral lock
      await wdkManager.createCollateralLock(userId, loanId, collateralAmount);
      
      // Disburse loan
      await wdkManager.disburseLoan(userId, loanId, Array.isArray(loan.amount) ? loan.amount[0] : loan.amount);
      
      // Update loan status
      await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: 'ACTIVE',
          acceptedAt: new Date(),
        },
      });

      res.json({ message: 'Loan accepted and disbursed' });
    } else {
      // Reject loan
      await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: 'REJECTED',
        },
      });

      res.json({ message: 'Loan rejected' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to process loan response' });
  }
});

export default router;
