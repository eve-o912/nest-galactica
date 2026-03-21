import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from './db';
import { yoProtocol } from './services/yield/YOProtocolManager';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * AI Financial Advisor
 * Uses Gemini to provide personalized financial guidance
 */
export async function getFinancialAdvice(
  userId: string,
  message: string
): Promise<string> {
  try {
    // Get user context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        goals: { where: { status: 'active' } },
        loans: { where: { status: { in: ['offered', 'active'] } } },
      },
    });
    
    if (!user) throw new Error('User not found');
    
    // Calculate total saved
    const totalSaved = user.goals.reduce(
      (sum: number, g: any) => sum + g.currentAmount,
      0
    );
    
    // Calculate total debt
    const totalDebt = user.loans.reduce(
      (sum: number, l: any) => sum + (l.amount - (l.paidInstallments * l.monthlyPayment)),
      0
    );
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `You are Nest, an AI financial advisor. You help users make smart financial decisions.

USER CONTEXT:
- Total Saved: $${totalSaved.toFixed(2)}
- Monthly Income: $${user.monthlyIncome}
- Monthly Expenses: $${user.monthlyExpenses}
- Active Loans: $${totalDebt.toFixed(2)}
- Credit Score: ${user.creditScore}

ACTIVE GOALS:
${user.goals.map((g: any) => `- ${g.name} (${g.type}): $${g.currentAmount}/$${g.targetAmount} (${((g.currentAmount / g.targetAmount) * 100).toFixed(0)}%)`).join('\n')}

GUIDELINES:
- Be supportive but honest
- Provide actionable advice in 2-4 sentences
- Focus on emergency fund first, then debt, then goals
- Use simple, encouraging language
- Reference their specific situation

User question: ${message}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text || 'I apologize, but I encountered an error processing your request.';
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    return 'I\'m having trouble connecting right now. Please try again in a moment.';
  }
}

/**
 * Autonomous Agent - Analyzes goals and makes decisions
 */
export async function analyzeGoalsAndDecide(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        goals: { where: { status: 'active' }, orderBy: { priority: 'asc' } },
        loans: { where: { status: 'active' } },
      },
    });
    
    if (!user || !user.goals.length) return;
    
    // Decision 1: Check if any goal needs bridge loan
    for (const goal of user.goals) {
      if (!goal.deadline) continue;
      
      const daysUntil = Math.floor(
        (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      // Offer loan if deadline within 30 days and shortfall exists
      if (daysUntil > 0 && daysUntil <= 30) {
        const shortfall = goal.targetAmount - goal.currentAmount;
        
        if (shortfall > 0 && shortfall <= goal.currentAmount * 0.5) {
          // Only offer if shortfall <= 50% of saved (collateral requirement)
          await offerBridgeLoan(userId, goal.id, shortfall);
        }
      }
    }
    
    // Decision 2: Rebalance allocations if needed
    await rebalanceAllocations(userId);
    
    // Decision 3: Optimize idle funds to YO Protocol
    await optimizeToYieldProtocol(userId);
    
  } catch (error) {
    console.error('❌ Agent analysis failed:', error);
  }
}

/**
 * Offer bridge loan for unfulfilled goal
 */
async function offerBridgeLoan(
  userId: string,
  goalId: string,
  amount: number
): Promise<void> {
  try {
    // Check if loan already offered
    const existing = await prisma.loan.findFirst({
      where: { userId, goalId, status: 'offered' },
    });
    
    if (existing) return; // Don't duplicate offers
    
    // Calculate loan terms
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    
    const disposableIncome = user.monthlyIncome - user.monthlyExpenses;
    const maxMonthlyPayment = disposableIncome * 0.3; // Max 30% of disposable
    
    const durationMonths = Math.ceil(amount / maxMonthlyPayment);
    const apr = 0.06; // 6% APR
    const monthlyPayment = amount / durationMonths * (1 + (apr / 12));
    
    // Create loan offer
    const loan = await prisma.loan.create({
      data: {
        userId,
        goalId,
        amount,
        apr,
        durationMonths,
        monthlyPayment,
        totalInstallments: durationMonths,
        status: 'offered',
        riskScore: calculateRiskScore(user),
        offeredAt: new Date(),
      },
    });
    
    // Log decision
    await prisma.agentDecision.create({
      data: {
        userId,
        action: 'offer_bridge_loan',
        reasoning: `Goal deadline approaching. Offering $${amount} loan at ${(apr * 100).toFixed(1)}% APR to bridge the gap.`,
        confidence: 0.85,
        parameters: JSON.stringify({ loanId: loan.id, amount, apr }),
      },
    });
    
    console.log(`🤖 Agent: Offered bridge loan $${amount} for goal ${goalId}`);
  } catch (error) {
    console.error('❌ Bridge loan offer failed:', error);
  }
}

/**
 * Rebalance goal allocations based on priorities
 */
async function rebalanceAllocations(userId: string): Promise<void> {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId, status: 'active' },
      orderBy: { priority: 'asc' },
    });
    
    if (!goals.length) return;
    
    let remainingPercentage = 1.0;
    
    for (const goal of goals) {
      const progress = goal.currentAmount / goal.targetAmount;
      
      let allocation = 0;
      
      if (progress >= 1.0) {
        // Goal complete - no allocation
        allocation = 0;
      } else if (goal.type === 'emergency') {
        // Emergency always gets 50%
        allocation = Math.min(0.5, remainingPercentage);
      } else if (goal.deadline) {
        const daysUntil = Math.floor(
          (new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntil < 90) {
          // Urgent goals get 30%
          allocation = Math.min(0.3, remainingPercentage);
        } else {
          // Normal goals share remaining
          allocation = remainingPercentage / (goals.length - goals.indexOf(goal));
        }
      } else {
        // No deadline - low priority
        allocation = remainingPercentage / (goals.length - goals.indexOf(goal));
      }
      
      // Update allocation
      await prisma.goal.update({
        where: { id: goal.id },
        data: { allocationPercent: allocation },
      });
      
      remainingPercentage -= allocation;
    }
    
    console.log(`🤖 Agent: Rebalanced allocations for ${goals.length} goals`);
  } catch (error) {
    console.error('❌ Rebalancing failed:', error);
  }
}

/**
 * Calculate user risk score (1-10)
 */
function calculateRiskScore(user: any): number {
  let score = 5; // Base score
  
  // Good credit
  if (user.creditScore > 750) score -= 2;
  else if (user.creditScore < 600) score += 2;
  
  // Income stability (simplified)
  const debtToIncome = 0; // Would calculate from actual loans
  if (debtToIncome < 0.3) score -= 1;
  else if (debtToIncome > 0.5) score += 2;
  
  return Math.max(1, Math.min(10, score));
}

/**
 * Optimize idle funds by depositing to YO Protocol
 */
async function optimizeToYieldProtocol(userId: string): Promise<void> {
  try {
    const goals = await prisma.goal.findMany({
      where: { userId, status: 'active' },
    });
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.walletAddress) return;
    
    let idleFunds = 0;
    
    // Calculate idle funds (surplus beyond minimum needed)
    for (const goal of goals) {
      // Emergency fund: keep 100% liquid (never deposit to YO)
      if (goal.type === 'emergency') continue;
      
      // For other goals: deposit 80% of current savings to YO
      // Keep 20% liquid for immediate withdrawals
      const depositableAmount = goal.currentAmount * 0.8;
      idleFunds += depositableAmount;
    }
    
    // Only deposit if >= $100 minimum
    if (idleFunds >= 100) {
      await yoProtocol.autoDepositIdleFunds(
        userId,
        user.walletAddress,
        idleFunds
      );
      
      // Log decision
      await prisma.agentDecision.create({
        data: {
          userId,
          action: 'optimize_yield',
          reasoning: `Deposited $${idleFunds.toFixed(2)} idle funds to YO Protocol yoUSD vault. Expected APY: 8-12%. Funds earning yield while maintaining 20% liquidity reserve.`,
          confidence: 0.95,
          parameters: JSON.stringify({ amount: idleFunds, vault: 'yoUSD' }),
        },
      });
      
      console.log(`🤖 Agent: Deposited $${idleFunds} to YO Protocol`);
    }
  } catch (error) {
    console.error('❌ YO optimization failed:', error);
  }
}
