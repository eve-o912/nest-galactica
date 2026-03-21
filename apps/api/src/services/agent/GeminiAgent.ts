import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
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
 * Gemini Agent - AI intelligence using Google Gemini API
 */
export class GeminiAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private systemPrompt: string;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    this.systemPrompt = this.buildSystemPrompt();
  }

  async executeAgentLoop(userId: string): Promise<void> {
    try {
      logger.info('Starting Gemini agent loop', { userId });

      const context = await this.gatherContext(userId);
      const analysis = await this.analyzeSituation(context);
      const decisions = await this.makeDecisions(context, analysis);

      for (const decision of decisions) {
        await this.executeDecision(userId, decision);
      }

      logger.info('Gemini agent loop completed', {
        userId,
        decisionsCount: decisions.length,
      });
    } catch (error) {
      logger.error('Gemini agent loop failed', { userId, error });
    }
  }

  private async gatherContext(userId: string): Promise<AgentContext> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        nests: { where: { status: 'ACTIVE' }, include: { vaults: true } },
        loans: { where: { status: { in: ['ACTIVE', 'OFFERED'] } } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });

    if (!user) throw new Error('User not found');

    const emergencyNest = user.nests.find((n) => n.type === 'EMERGENCY');
    const emergencyMonths = emergencyNest
      ? parseFloat(emergencyNest.currentAmount) / user.monthlyExpenses.toNumber()
      : 0;

    return {
      userId,
      userProfile: user,
      nests: user.nests,
      loans: user.loans,
      recentTransactions: user.transactions,
      financialHealth: {
        emergencyFundStatus:
          emergencyMonths === 0 ? 'none' : emergencyMonths >= 3 ? 'adequate' : 'building',
        debtLevel: 'none' as const,
        savingsRate: 0,
        creditScore: user.creditScore,
      },
    };
  }

  private async analyzeSituation(context: AgentContext): Promise<any> {
    const prompt = `Analyze this user's financial situation:

User Profile:
- Monthly Income: $${context.userProfile.monthlyIncome}
- Monthly Expenses: $${context.userProfile.monthlyExpenses}
- Credit Score: ${context.financialHealth.creditScore}

Financial Health:
- Emergency Fund: ${context.financialHealth.emergencyFundStatus}

Active Nests:
${context.nests.map((n) => `- ${n.name}: $${n.currentAmount}/$${n.targetAmount}`).join('\n')}

Provide JSON analysis with:
{
  "priority": "emergency_fund" | "debt_payoff" | "goal_funding",
  "riskLevel": "low" | "medium" | "high",
  "concerns": ["concern 1"],
  "opportunities": ["opportunity 1"],
  "recommendations": [
    {
      "action": "description",
      "impact": "expected outcome",
      "urgency": "low" | "medium" | "high"
    }
  ]
}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return JSON.parse(text);
  }

  private async makeDecisions(context: AgentContext, analysis: any): Promise<AgentDecision[]> {
    const decisions: AgentDecision[] = [];

    if (analysis.priority === 'emergency_fund' && context.financialHealth.emergencyFundStatus !== 'adequate') {
      const rebalance = await this.decideRebalance(context);
      if (rebalance) decisions.push(rebalance);
    }

    for (const nest of context.nests) {
      if (!nest.deadline) continue;
      const daysUntil = Math.floor((new Date(nest.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0 && daysUntil <= 30) {
        const loanDecision = await this.evaluateBridgeLoan(context, nest);
        if (loanDecision) decisions.push(loanDecision);
      }
    }

    return decisions;
  }

  private async decideRebalance(context: AgentContext): Promise<AgentDecision | null> {
    const emergencyNest = context.nests.find((n) => n.type === 'EMERGENCY');
    if (!emergencyNest) return null;

    const target = context.userProfile.monthlyExpenses.toNumber() * 3;
    const current = parseFloat(emergencyNest.currentAmount);

    if (current < target * 0.5) {
      return {
        action: 'rebalance_allocations',
        reasoning: `Emergency fund is only ${((current / target) * 100).toFixed(0)}% of target`,
        confidence: 0.95,
        parameters: {
          emergencyNestId: emergencyNest.id,
          newAllocation: 0.6,
        },
      };
    }

    return null;
  }

  private async evaluateBridgeLoan(context: AgentContext, nest: any): Promise<AgentDecision | null> {
    const shortfall = parseFloat(nest.targetAmount) - parseFloat(nest.currentAmount);
    if (shortfall <= 0) return null;

    const prompt = `Make a credit decision for bridge loan:

User Financial Profile:
- Monthly Income: $${context.userProfile.monthlyIncome}
- Monthly Expenses: $${context.userProfile.monthlyExpenses}
- Credit Score: ${context.financialHealth.creditScore}

Loan Request:
- Amount: $${shortfall.toFixed(2)}
- Purpose: ${nest.name}
- Existing Savings: $${nest.currentAmount}

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
  "riskScore": 1-10
}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const decision = JSON.parse(response.text());

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

  private async executeDecision(userId: string, decision: AgentDecision): Promise<void> {
    try {
      switch (decision.action) {
        case 'rebalance_allocations':
          await this.executeRebalance(userId, decision.parameters);
          break;
        case 'offer_bridge_loan':
          await this.executeOfferLoan(userId, decision.parameters);
          break;
      }

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
  }

  async getAIResponse(userId: string, message: string): Promise<string> {
    try {
      const context = await this.gatherContext(userId);
      
      const prompt = `You are Nest Advisor, an AI financial advisor. 

User Context:
- Monthly Income: $${context.userProfile.monthlyIncome}
- Monthly Expenses: $${context.userProfile.monthlyExpenses}
- Credit Score: ${context.financialHealth.creditScore}
- Emergency Fund Status: ${context.financialHealth.emergencyFundStatus}

Active Goals:
${context.nests.map((n) => `- ${n.name}: $${n.currentAmount}/$${n.targetAmount}`).join('\n')}

User asks: "${message}"

Provide a helpful, personalized financial response. Be encouraging but realistic. Keep it under 200 words.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      logger.error('Gemini chat failed', { userId, error });
      return "I'm having trouble processing your request right now. Please try again.";
    }
  }

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

Always provide:
- Clear data-driven reasoning
- Risk assessment
- Expected outcomes

Output: Valid JSON only, no markdown.`;
  }
}

export const geminiAgent = new GeminiAgent();
