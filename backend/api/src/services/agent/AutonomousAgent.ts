import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { wdkManager } from '../wdk/WDKManager';

interface AgentContext {
  userId: string;
  userProfile: any;
  nests: any[];
  loans: any[];
  recentTransactions: any[];
  financialHealth: {
    emergencyFundStatus: 'none' | 'building' | 'adequate';
    debtLevel: 'none' | 'manageable' | 'high';
    savingsRate: number;
    creditScore: number;
  };
}

interface AgentDecision {
  action: string;
  reasoning: string;
  confidence: number;
  parameters: Record<string, any>;
}

/**
 * Autonomous Agent - Core AI intelligence
 * 
 * Capabilities:
 * 1. Financial analysis using Claude AI
 * 2. Autonomous decision-making (no human approval needed for most actions)
 * 3. Proactive interventions (spending alerts, rebalancing)
 * 4. Credit assessment for loan approvals
 * 
 * Runs in continuous loops via AgentScheduler
 */
export class AutonomousAgent {
  private anthropic: Anthropic;
  private systemPrompt: string;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    this.systemPrompt = this.buildSystemPrompt();
  }

  /**
   * Main agent loop - executes autonomously for each user
   * Called by AgentScheduler every 15 minutes
   */
  async executeAgentLoop(userId: string): Promise<void> {
    try {
      logger.info('Starting agent loop', { userId });

      // 1. Gather complete context
      const context = await this.gatherContext(userId);

      // 2. Analyze situation with Claude AI
      const analysis = await this.analyzeSituation(context);

      // 3. Make autonomous decisions
      const decisions = await this.makeDecisions(context, analysis);

      // 4. Execute decisions
      for (const decision of decisions) {
        await this.executeDecision(userId, decision);
      }

      logger.info('Agent loop completed', {
        userId,
        decisionsCount: decisions.length,
      });
    } catch (error) {
      logger.error('Agent loop failed', { userId, error });
    }
  }

  /**
   * Gather complete financial context
   */
  private async gatherContext(userId: string): Promise<AgentContext> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        nests: {
          where: { status: 'ACTIVE' },
          include: {
            vaults: true,
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        loans: {
          where: { status: { in: ['ACTIVE', 'OFFERED'] } },
          include: { repaymentSchedule: true },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!user) throw new Error('User not found');

    // Assess financial health
    const emergencyNest = user.nests.find((n) => n.type === 'EMERGENCY');
    const emergencyMonths = emergencyNest
      ? parseFloat(emergencyNest.currentAmount) / user.monthlyExpenses.toNumber()
      : 0;

    const financialHealth = {
      emergencyFundStatus:
        (emergencyMonths === 0 ? 'none' : emergencyMonths >= 3 ? 'adequate' : 'building') as 'none' | 'building' | 'adequate',
      debtLevel: 'none' as const, // TODO: Calculate from active loans
      savingsRate: 0, // TODO: Calculate from transaction history
      creditScore: user.creditScore,
    };

    return {
      userId,
      userProfile: user,
      nests: user.nests,
      loans: user.loans,
      recentTransactions: user.transactions,
      financialHealth,
    };
  }

  /**
   * Use Claude AI to analyze financial situation
   */
  private async analyzeSituation(context: AgentContext): Promise<any> {
    const message = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: this.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Analyze this user's financial situation:

User Profile:
- Monthly Income: $${context.userProfile.monthlyIncome}
- Monthly Expenses: $${context.userProfile.monthlyExpenses}
- Credit Score: ${context.financialHealth.creditScore}

Financial Health:
- Emergency Fund: ${context.financialHealth.emergencyFundStatus}
- Debt Level: ${context.financialHealth.debtLevel}

Active Nests:
${context.nests.map((n) => `- ${n.name}: $${n.currentAmount}/$${n.targetAmount}`).join('\n')}

Recent Transactions (last 7 days):
${context.recentTransactions.slice(0, 10).map((t) => `- ${t.type}: $${t.amount}`).join('\n')}

Provide JSON analysis with:
{
  "priority": "emergency_fund" | "debt_payoff" | "goal_funding",
  "riskLevel": "low" | "medium" | "high",
  "concerns": ["concern 1", "concern 2"],
  "opportunities": ["opportunity 1"],
  "recommendations": [
    {
      "action": "description",
      "impact": "expected outcome",
      "urgency": "low" | "medium" | "high"
    }
  ]
}`,
        },
      ],
    });

    const response = message.content[0];
    if (response.type !== 'text') throw new Error('Unexpected response type');

    return JSON.parse(response.text);
  }

  /**
   * Make autonomous decisions based on analysis
   */
  private async makeDecisions(
    context: AgentContext,
    analysis: any
  ): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = [];

    // Decision 1: Rebalance if emergency fund is low
    if (
      analysis.priority === 'emergency_fund' &&
      context.financialHealth.emergencyFundStatus !== 'adequate'
    ) {
      const rebalance = await this.decideRebalance(context);
      if (rebalance) decisions.push(rebalance);
    }

    // Decision 2: Evaluate bridge loans for nearing deadlines
    for (const nest of context.nests) {
      if (!nest.deadline) continue;

      const daysUntil = Math.floor(
        (new Date(nest.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil > 0 && daysUntil <= 30) {
        const loanDecision = await this.evaluateBridgeLoan(context, nest);
        if (loanDecision) decisions.push(loanDecision);
      }
    }

    // Decision 3: Spending intervention if overspending detected
    if (analysis.riskLevel === 'high' && analysis.concerns.includes('overspending')) {
      decisions.push({
        action: 'send_spending_alert',
        reasoning: 'Spending patterns indicate user is over budget',
        confidence: 0.85,
        parameters: analysis.concerns,
      });
    }

    return decisions;
  }

  /**
   * Decide if allocations should be rebalanced
   */
  private async decideRebalance(
    context: AgentContext
  ): Promise<AgentDecision | null> {
    const emergencyNest = context.nests.find((n) => n.type === 'EMERGENCY');
    if (!emergencyNest) return null;

    const target = context.userProfile.monthlyExpenses.toNumber() * 3;
    const current = parseFloat(emergencyNest.currentAmount);

    if (current < target * 0.5) {
      return {
        action: 'rebalance_allocations',
        reasoning: `Emergency fund is only ${((current / target) * 100).toFixed(0)}% of target. Increasing priority.`,
        confidence: 0.95,
        parameters: {
          emergencyNestId: emergencyNest.id,
          newAllocation: 0.6,
        },
      };
    }

    return null;
  }

  /**
   * Evaluate if bridge loan should be offered
   * Uses Claude AI for credit decision
   */
  private async evaluateBridgeLoan(
    context: AgentContext,
    nest: any
  ): Promise<AgentDecision | null> {
    const shortfall =
      parseFloat(nest.targetAmount) - parseFloat(nest.currentAmount);

    if (shortfall <= 0) return null;

    // Use Claude for credit decision
    const creditDecision = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: this.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Make a credit decision for bridge loan:

User Financial Profile:
- Monthly Income: $${context.userProfile.monthlyIncome}
- Monthly Expenses: $${context.userProfile.monthlyExpenses}
- Credit Score: ${context.financialHealth.creditScore}
- Emergency Fund: ${context.financialHealth.emergencyFundStatus}

Loan Request:
- Amount: $${shortfall.toFixed(2)}
- Purpose: ${nest.name}
- Existing Savings (Collateral): $${nest.currentAmount}

Assess:
1. Can user afford repayment? (max 30% of disposable income)
2. Is collateral sufficient? (need 80%+ of loan amount)
3. What APR is fair? (4-12% based on risk)
4. Recommended duration? (6-24 months)

Return JSON:
{
  "decision": "approve" | "reject" | "modify",
  "reasoning": "explanation",
  "loanTerms": {
    "amount": "approved amount",
    "apr": 0.06,
    "durationMonths": 12,
    "monthlyPayment": "calculated payment"
  },
  "riskScore": 1-10,
  "alternatives": ["suggestion 1"]
}`,
        },
      ],
    });

    const response = creditDecision.content[0];
    if (response.type !== 'text') return null;

    const decision = JSON.parse(response.text);

    if (decision.decision !== 'approve') return null;

    return {
      action: 'offer_bridge_loan',
      reasoning: decision.reasoning,
      confidence: (10 - decision.riskScore) / 10,
      parameters: {
        nestId: nest.id,
        ...decision.loanTerms,
      },
    };
  }

  /**
   * Execute autonomous decision
   */
  private async executeDecision(
    userId: string,
    decision: AgentDecision
  ): Promise<void> {
    try {
      logger.info('Executing decision', { userId, action: decision.action });

      switch (decision.action) {
        case 'rebalance_allocations':
          await this.executeRebalance(userId, decision.parameters);
          break;

        case 'offer_bridge_loan':
          await this.executeOfferLoan(userId, decision.parameters);
          break;

        case 'send_spending_alert':
          await this.executeSpendingAlert(userId, decision.parameters);
          break;

        default:
          logger.warn('Unknown action', { action: decision.action });
      }

      // Record decision in database
      await prisma.agentDecision.create({
        data: {
          userId,
          action: decision.action,
          reasoning: decision.reasoning,
          confidence: decision.confidence,
          parameters: decision.parameters,
          status: 'EXECUTED',
          executedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Decision execution failed', { userId, decision, error });
      throw error;
    }
  }

  private async executeRebalance(userId: string, params: any): Promise<void> {
    await prisma.nest.update({
      where: { id: params.emergencyNestId },
      data: { allocationPercentage: params.newAllocation },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'REBALANCE',
        title: 'Nest Allocation Updated',
        message: `I've adjusted your allocations to prioritize your emergency fund (${(params.newAllocation * 100).toFixed(0)}%).`,
      },
    });

    logger.info('Rebalance executed', { userId, params });
  }

  private async executeOfferLoan(userId: string, params: any): Promise<void> {
    const loan = await prisma.loan.create({
      data: {
        userId,
        nestId: params.nestId,
        amount: params.amount,
        apr: params.apr,
        durationMonths: params.durationMonths,
        monthlyPayment: params.monthlyPayment,
        totalInstallments: params.durationMonths,
        status: 'OFFERED',
        offeredAt: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'LOAN_OFFER',
        title: 'Bridge Loan Available',
        message: `I can offer you a $${params.amount} bridge loan at ${(params.apr * 100).toFixed(1)}% APR to help you reach your goal.`,
        actionRequired: true,
        metadata: { loanId: loan.id },
      },
    });

    logger.info('Loan offer created', { userId, loanId: loan.id });
  }

  private async executeSpendingAlert(
    userId: string,
    params: any
  ): Promise<void> {
    await prisma.notification.create({
      data: {
        userId,
        type: 'SPENDING_ALERT',
        title: 'Spending Check-In',
        message: 'Your spending is higher than usual this week. Want to review together?',
        metadata: params,
      },
    });

    logger.info('Spending alert sent', { userId });
  }

  /**
   * Build system prompt for Claude AI
   */
  private buildSystemPrompt(): string {
    return `You are Nest Advisor, an AI financial advisor agent.

Your role:
- Analyze users' financial situations holistically
- Make autonomous decisions about savings allocation and loan approvals
- Provide evidence-based recommendations
- Balance user goals with financial best practices

Financial principles:
1. Emergency fund FIRST (3-6 months expenses)
2. High-interest debt payoff SECOND
3. Long-term savings THIRD
4. Discretionary goals FOURTH

Risk assessment:
- Debt-to-income > 30% = high risk
- Emergency fund < 1 month = critical
- Payment > 30% disposable income = risky

Always provide:
- Clear data-driven reasoning
- Alternative options when applicable
- Risk assessment
- Expected outcomes

Output: Valid JSON only, no markdown.`;
  }
}

export const autonomousAgent = new AutonomousAgent();
