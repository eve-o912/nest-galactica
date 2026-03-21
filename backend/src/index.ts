import express from 'express';
import cors from 'cors';
import { prisma } from './db';
import { wdk, LENDING_POOL_ADDRESS } from './wdk';
import { getFinancialAdvice, analyzeGoalsAndDecide } from './agent';
import { yoProtocol } from './services/yield/YOProtocolManager';

const app = express();

app.use(cors());
app.use(express.json());

// ============================================================================
// AUTH
// ============================================================================

app.post('/api/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Create user
    const user = await prisma.user.create({
      data: { email, password, name },
    });
    
    // Create WDK wallet
    const wallet = await wdk.createWallet(user.id);
    
    // Update user with wallet
    await prisma.user.update({
      where: { id: user.id },
      data: {
        walletAddress: wallet.address,
        walletBackup: wallet.encryptedPrivateKey,
      },
    });
    
    res.json({ user: { ...user, password: undefined } });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(400).json({
      error: error.code === 'P2002' ? 'Email already exists' : 'Signup failed',
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await prisma.user.findFirst({
      where: { email, password },
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ user: { ...user, password: undefined } });
  } catch (error) {
    res.status(400).json({ error: 'Login failed' });
  }
});

// ============================================================================
// GOALS
// ============================================================================

app.get('/api/goals/:userId', async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId: req.params.userId },
      include: {
        deposits: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        loans: {
          where: { status: { in: ['offered', 'active'] } },
        },
      },
      orderBy: { priority: 'asc' },
    });
    
    res.json({ goals });
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch goals' });
  }
});

app.post('/api/goals', async (req, res) => {
  try {
    const { userId, name, type, targetAmount, deadline } = req.body;
    
    // Determine priority
    let priority = 3;
    if (type === 'emergency') priority = 1;
    else if (deadline && new Date(deadline) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) {
      priority = 2; // Urgent if deadline < 90 days
    }
    
    const goal = await prisma.goal.create({
      data: {
        userId,
        name,
        type,
        targetAmount,
        deadline: deadline ? new Date(deadline) : null,
        priority,
      },
    });
    
    // Trigger agent rebalancing
    await analyzeGoalsAndDecide(userId);
    
    res.json({ goal });
  } catch (error) {
    res.status(400).json({ error: 'Failed to create goal' });
  }
});

// ============================================================================
// DEPOSITS
// ============================================================================

app.post('/api/deposit', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        goals: {
          where: { status: 'active' },
          orderBy: { priority: 'asc' },
        },
      },
    });
    
    if (!user || !user.walletAddress) {
      return res.status(404).json({ error: 'User or wallet not found' });
    }
    
    // Process deposit via WDK
    const tx = await wdk.deposit(
      'user_external_wallet',
      user.walletAddress,
      amount
    );
    
    // Allocate across goals based on agent's allocation percentages
    const allocations: { goalId: string; amount: number }[] = [];
    
    for (const goal of user.goals) {
      if (goal.allocationPercent > 0) {
        const allocAmount = amount * goal.allocationPercent;
        
        // Update goal balance
        await prisma.goal.update({
          where: { id: goal.id },
          data: { currentAmount: { increment: allocAmount } },
        });
        
        // Record deposit
        await prisma.deposit.create({
          data: {
            userId,
            goalId: goal.id,
            amount: allocAmount,
            txHash: tx.hash,
          },
        });
        
        allocations.push({ goalId: goal.id, amount: allocAmount });
      }
    }
    
    // Trigger agent analysis
    await analyzeGoalsAndDecide(userId);
    
    res.json({ tx, allocations });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(400).json({ error: 'Deposit failed' });
  }
});

// ============================================================================
// LOANS
// ============================================================================

app.get('/api/loans/:userId', async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: { userId: req.params.userId },
      include: {
        goal: true,
        repayments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ loans });
  } catch (error) {
    res.status(400).json({ error: 'Failed to fetch loans' });
  }
});

app.post('/api/loans/:loanId/accept', async (req, res) => {
  try {
    const { loanId } = req.params;
    
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { user: true, goal: true },
    });
    
    if (!loan || loan.status !== 'offered') {
      return res.status(404).json({ error: 'Loan not found or already accepted' });
    }
    
    // Lock collateral (goal's current savings)
    const collateralAmount = loan.goal.currentAmount;
    
    // Disburse loan via WDK
    const tx = await wdk.disburseLoan(
      LENDING_POOL_ADDRESS,
      loan.user.walletAddress!,
      loan.amount,
      loan.id
    );
    
    // Update goal with loan amount
    await prisma.goal.update({
      where: { id: loan.goalId },
      data: { currentAmount: { increment: loan.amount } },
    });
    
    // Update loan status
    await prisma.loan.update({
      where: { id: loanId },
      data: {
        status: 'active',
        acceptedAt: new Date(),
        disbursedAt: new Date(),
        disbursementTxHash: tx.hash,
        collateralAmount,
        collateralLocked: true,
      },
    });
    
    // Create repayment schedule
    for (let i = 1; i <= loan.totalInstallments; i++) {
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + i);
      
      await prisma.repayment.create({
        data: {
          loanId,
          installmentNumber: i,
          amount: loan.monthlyPayment,
          dueDate,
        },
      });
    }
    
    res.json({ loan, tx });
  } catch (error) {
    console.error('Loan acceptance error:', error);
    res.status(400).json({ error: 'Failed to accept loan' });
  }
});

app.post('/api/loans/:loanId/repay', async (req, res) => {
  try {
    const { loanId } = req.params;
    const { installmentNumber } = req.body;
    
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: true,
        repayments: {
          where: { installmentNumber },
        },
      },
    });
    
    if (!loan || !loan.user.walletAddress) {
      return res.status(404).json({ error: 'Loan not found' });
    }
    
    const repayment = loan.repayments[0];
    if (!repayment || repayment.status === 'paid') {
      return res.status(400).json({ error: 'Repayment not found or already paid' });
    }
    
    // Process repayment via WDK
    const tx = await wdk.repayLoan(
      loan.user.walletAddress,
      LENDING_POOL_ADDRESS,
      repayment.amount
    );
    
    // Update repayment
    await prisma.repayment.update({
      where: { id: repayment.id },
      data: {
        status: 'paid',
        paidAt: new Date(),
        txHash: tx.hash,
      },
    });
    
    // Update loan
    await prisma.loan.update({
      where: { id: loanId },
      data: { paidInstallments: { increment: 1 } },
    });
    
    // Check if fully repaid
    if (loan.paidInstallments + 1 === loan.totalInstallments) {
      await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: 'repaid',
          repaidAt: new Date(),
          collateralLocked: false, // Unlock collateral
        },
      });
    }
    
    res.json({ tx, repayment });
  } catch (error) {
    console.error('Repayment error:', error);
    res.status(400).json({ error: 'Repayment failed' });
  }
});

// ============================================================================
// CHAT
// ============================================================================

app.post('/api/chat', async (req, res) => {
  try {
    const { userId, message } = req.body;
    
    // Save user message
    await prisma.message.create({
      data: { userId, role: 'user', content: message },
    });
    
    // Get AI response
    const advice = await getFinancialAdvice(userId, message);
    
    // Save AI message
    await prisma.message.create({
      data: { userId, role: 'assistant', content: advice },
    });
    
    res.json({ advice });
  } catch (error) {
    res.status(400).json({ error: 'Chat failed' });
  }
});

app.get('/api/chat/:userId', async (req, res) => {
  try {
    const messages = await prisma.message.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    
    res.json({ messages });
  } catch (error) {
    res.status(400).json({ error: 'Failed to load messages' });
  }
});

// ============================================================================
// DASHBOARD
// ============================================================================

app.get('/api/dashboard/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
        goals: {
          where: { status: 'active' },
          include: {
            deposits: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
            loans: {
              where: { status: { in: ['offered', 'active'] } },
            },
          },
          orderBy: { priority: 'asc' },
        },
        loans: {
          where: { status: { in: ['offered', 'active'] } },
          include: {
            goal: true,
            repayments: {
              where: { status: 'scheduled' },
              orderBy: { dueDate: 'asc' },
              take: 1,
            },
          },
        },
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: { ...user, password: undefined } });
  } catch (error) {
    res.status(400).json({ error: 'Failed to load dashboard' });
  }
});

// ============================================================================
// YO PROTOCOL YIELD
// ============================================================================

app.get('/api/yo/vaults', async (req, res) => {
  try {
    const vaults = await yoProtocol.getAvailableVaults();
    res.json({ vaults });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/yo/earnings/:userId', async (req, res) => {
  try {
    const earnings = await yoProtocol.calculateEarnings(req.params.userId);
    res.json({ earnings });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/yo/deposit', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.walletAddress) {
      return res.status(404).json({ error: 'User wallet not found' });
    }
    
    const result = await yoProtocol.depositUSDC(
      userId,
      user.walletAddress,
      amount
    );
    
    res.json({ result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/yo/withdraw', async (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.walletAddress) {
      return res.status(404).json({ error: 'User wallet not found' });
    }
    
    const result = await yoProtocol.withdrawUSDC(
      userId,
      user.walletAddress,
      amount
    );
    
    res.json({ result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`
🚀 Nest Backend Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 API: http://localhost:${PORT}
📊 Database GUI: Run 'npm run studio'
🔗 WDK Network: ${process.env.WDK_NETWORK || 'testnet'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
