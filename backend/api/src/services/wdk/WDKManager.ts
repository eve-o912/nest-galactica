import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { WDKClient, WDKWallet, WDKVault, WDKTransaction, WDKTimeLock } from './WDKClient';

interface WDKManagerConfig {
  network: 'mainnet' | 'testnet';
  apiKey: string;
  rpcUrl?: string;
}

/**
 * WDK Manager - High-level business logic for WDK integration
 * 
 * This layer handles the financial business logic while WDKClient
 * handles the direct blockchain interactions.
 */
export class WDKManager {
  private wdkClient: WDKClient;
  private config: WDKManagerConfig;

  constructor(config: WDKManagerConfig) {
    this.config = config;
    this.wdkClient = new WDKClient({
      network: config.network,
      apiKey: config.apiKey,
      rpcUrl: config.rpcUrl,
    });
    
    logger.info('WDK Manager initialized', { network: config.network });
  }

  /**
   * Complete wallet creation workflow for new users
   */
  async createUserWallet(userId: string): Promise<WDKWallet> {
    try {
      logger.info('Creating complete wallet setup', { userId });

      // Step 1: Create main WDK wallet
      const wallet = await this.wdkClient.createWallet(userId);

      // Step 2: Store wallet in database
      await prisma.wallet.create({
        data: {
          userId,
          address: wallet.address,
          type: 'NON_CUSTODIAL',
          encryptedBackup: wallet.encryptedBackup,
        },
      });

      // Step 3: Create default vaults for different purposes
      await this.createDefaultVaults(userId, wallet.address);

      logger.info('Complete wallet setup successful', { 
        userId, 
        walletAddress: wallet.address 
      });

      return wallet;
    } catch (error) {
      logger.error('Failed to create user wallet:', error);
      throw new Error(`Wallet setup failed: ${error}`);
    }
  }

  /**
   * Create standard vault structure for new wallets
   */
  private async createDefaultVaults(userId: string, walletAddress: string): Promise<void> {
    const vaultTypes = [
      { name: 'emergency_nest', type: 'EMERGENCY' as const },
      { name: 'savings_nest', type: 'SAVINGS' as const },
      { name: 'lending_pool', type: 'LENDING' as const },
    ];

    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) throw new Error('Wallet not found');

    for (const vaultType of vaultTypes) {
      // Create vault in WDK
      const wdkVault = await this.wdkClient.createVault(
        walletAddress,
        vaultType.type,
        vaultType.name
      );

      // Store vault in database
      await prisma.vault.create({
        data: {
          walletId: wallet.id,
          address: wdkVault.address,
          name: wdkVault.name,
          type: vaultType.type,
        },
      });
    }

    logger.info('Default vaults created', { userId });
  }

  /**
   * Handle deposit and intelligent allocation across nests
   * 
   * This is a core feature - when users deposit funds, the AI agent
   * automatically allocates across different goals based on priority
   */
  async handleDeposit(
    userId: string,
    amount: string,
    token: 'USDT' | 'XAUT' = 'USDT'
  ): Promise<WDKTransaction[]> {
    try {
      logger.info('Processing intelligent deposit allocation', { userId, amount, token });

      // Get user's financial context
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          wallet: { include: { vaults: true } },
          nests: { where: { status: 'ACTIVE' }, orderBy: { priority: 'asc' } },
        },
      });

      if (!user?.wallet) throw new Error('User wallet not found');

      // Calculate AI-driven allocation strategy
      const allocation = await this.calculateIntelligentAllocation(user.nests, amount);

      const transactions: WDKTransaction[] = [];

      // Execute transfers to each vault
      for (const [nestId, allocAmount] of Object.entries(allocation)) {
        if (parseFloat(allocAmount) === 0) continue;

        const vault = user.wallet.vaults.find((v) => v.nestId === nestId);
        if (!vault) continue;

        // Execute WDK transfer
        const tx = await this.wdkClient.transfer({
          from: user.wallet.address,
          to: vault.address,
          amount: allocAmount,
          token,
          metadata: { 
            type: 'auto_allocation', 
            nestId,
            userId,
            timestamp: new Date().toISOString()
          },
        });

        transactions.push(tx);

        // Update database records
        await this.updateAllocationRecords(userId, nestId, allocAmount, tx, token);
      }

      logger.info('Deposit allocation completed', { 
        userId, 
        totalTransactions: transactions.length,
        totalAllocated: amount
      });

      return transactions;
    } catch (error) {
      logger.error('Deposit allocation failed:', error);
      throw error;
    }
  }

  /**
   * AI-driven allocation calculation based on financial priorities
   */
  private async calculateIntelligentAllocation(
    nests: any[],
    totalAmount: string
  ): Promise<Record<string, string>> {
    const allocation: Record<string, string> = {};
    let remaining = parseFloat(totalAmount);

    // Sort by priority (1=highest priority)
    const sortedNests = nests.sort((a, b) => a.priority - b.priority);

    for (const nest of sortedNests) {
      if (remaining <= 0) break;

      const progress = parseFloat(nest.currentAmount) / parseFloat(nest.targetAmount);
      if (progress >= 1.0) continue; // Skip completed goals

      let share: number;

      // Priority-based allocation algorithm
      if (nest.priority === 1) {
        // Emergency fund gets 50% until fully funded
        share = Math.min(remaining * 0.5, remaining);
      } else if (nest.priority === 2) {
        // Medium priority gets 30%
        share = Math.min(remaining * 0.3, remaining);
      } else {
        // Lower priority gets remaining
        share = remaining;
      }

      allocation[nest.id] = share.toFixed(2);
      remaining -= share;
    }

    return allocation;
  }

  /**
   * Update database records after allocation
   */
  private async updateAllocationRecords(
    userId: string,
    nestId: string,
    amount: string,
    transaction: WDKTransaction,
    token: 'USDT' | 'XAUT'
  ): Promise<void> {
    // Record transaction
    await prisma.transaction.create({
      data: {
        userId,
        nestId,
        type: 'AUTO_ALLOCATION',
        amount,
        token,
        fromAddress: transaction.from,
        toAddress: transaction.to,
        hash: transaction.hash,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        metadata: transaction.metadata,
      },
    });

    // Update vault balance (mock - in production, get from WDK)
    const vault = await prisma.vault.findFirst({ where: { nestId } });
    if (vault) {
      await prisma.vault.update({
        where: { id: vault.id },
        data: { balance: { increment: amount } },
      });
    }

    // Update nest amount
    await prisma.nest.update({
      where: { id: nestId },
      data: { currentAmount: { increment: amount } },
    });
  }

  /**
   * Create collateral time-lock for bridge loans
   * 
   * This is a critical security feature - collateral is locked in
   * smart contracts until loan is fully repaid
   */
  async createCollateralLock(
    userId: string,
    loanId: string,
    amount: string
  ): Promise<WDKTimeLock> {
    try {
      logger.info('Creating collateral time-lock', { userId, loanId, amount });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: { include: { vaults: true } } },
      });

      if (!user?.wallet) throw new Error('User wallet not found');

      const loan = await prisma.loan.findUnique({ where: { id: loanId } });
      if (!loan) throw new Error('Loan not found');

      // Find vault with sufficient funds
      const sourceVault = user.wallet.vaults.find(
        (v) => parseFloat(v.balance) >= parseFloat(amount)
      );

      if (!sourceVault) throw new Error('Insufficient collateral funds');

      // Create time-lock conditions
      const conditions = [
        {
          type: 'event' as const,
          value: { event: 'loan_repaid', loanId }
        },
        {
          type: 'time' as const,
          value: Date.now() + loan.durationMonths * 30 * 86400000
        }
      ];

      // Create WDK time-lock
      const timeLock = await this.wdkClient.createTimeLock({
        vaultAddress: sourceVault.address,
        amount,
        token: 'USDT',
        conditions,
        lockDuration: loan.durationMonths * 30 * 24 * 60 * 60 * 1000,
      });

      // Record in database
      await prisma.collateral.create({
        data: {
          userId,
          loanId,
          amount,
          timeLockId: timeLock.id,
          status: 'LOCKED',
          unlockConditions: timeLock.conditions,
        },
      });

      logger.info('Collateral time-lock created successfully', { 
        timeLockId: timeLock.id,
        amount
      });

      return timeLock;
    } catch (error) {
      logger.error('Collateral lock creation failed:', error);
      throw error;
    }
  }

  /**
   * Disburse bridge loan from platform lending pool
   */
  async disburseLoan(
    userId: string,
    loanId: string,
    amount: string
  ): Promise<WDKTransaction> {
    try {
      logger.info('Disbursing bridge loan', { userId, loanId, amount });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: true },
      });

      if (!user?.wallet) throw new Error('User wallet not found');

      const lendingPoolAddress = process.env.LENDING_POOL_ADDRESS!;
      if (!lendingPoolAddress) throw new Error('Lending pool address not configured');

      // Transfer funds from lending pool to user
      const transaction = await this.wdkClient.transfer({
        from: lendingPoolAddress,
        to: user.wallet.address,
        amount,
        token: 'USDT',
        metadata: {
          type: 'loan_disbursement',
          loanId,
          userId,
          timestamp: new Date().toISOString()
        },
      });

      // Record transaction
      await prisma.transaction.create({
        data: {
          userId,
          loanId,
          type: 'LOAN_DISBURSEMENT',
          amount,
          token: 'USDT',
          fromAddress: lendingPoolAddress,
          toAddress: user.wallet.address,
          hash: transaction.hash,
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          metadata: transaction.metadata,
        },
      });

      // Update loan status
      await prisma.loan.update({
        where: { id: loanId },
        data: {
          status: 'ACTIVE',
          disbursedAt: new Date(),
          transactionHash: transaction.hash,
        },
      });

      logger.info('Loan disbursed successfully', { 
        loanId, 
        transactionHash: transaction.hash 
      });

      return transaction;
    } catch (error) {
      logger.error('Loan disbursement failed:', error);
      throw error;
    }
  }

  /**
   * Process automatic loan repayment
   */
  async processRepayment(
    loanId: string,
    installmentNumber: number
  ): Promise<WDKTransaction> {
    try {
      logger.info('Processing loan repayment', { loanId, installmentNumber });

      const loan = await prisma.loan.findUnique({
        where: { id: loanId },
        include: {
          user: { include: { wallet: true } },
          repaymentSchedule: { where: { installmentNumber } },
        },
      });

      if (!loan || !loan.user.wallet) throw new Error('Loan or wallet not found');

      const installment = loan.repaymentSchedule[0];
      if (!installment) throw new Error('Installment not found');

      const lendingPoolAddress = process.env.LENDING_POOL_ADDRESS!;

      // Transfer repayment from user to lending pool
      const transaction = await this.wdkClient.transfer({
        from: loan.user.wallet.address,
        to: lendingPoolAddress,
        amount: installment.amount.toString(),
        token: 'USDT',
        metadata: {
          type: 'loan_repayment',
          loanId,
          installmentNumber,
          userId: loan.userId,
        },
      });

      // Update repayment record
      await prisma.repaymentSchedule.update({
        where: { id: installment.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          transactionHash: transaction.hash,
        },
      });

      // Update loan progress
      await prisma.loan.update({
        where: { id: loanId },
        data: { paidInstallments: { increment: 1 } },
      });

      // Check if loan is fully repaid
      const updatedLoan = await prisma.loan.findUnique({
        where: { id: loanId },
      });

      if (updatedLoan!.paidInstallments === updatedLoan!.totalInstallments) {
        await this.unlockCollateral(loanId);
        await prisma.loan.update({
          where: { id: loanId },
          data: { status: 'REPAID', repaidAt: new Date() },
        });
      }

      logger.info('Loan repayment processed successfully', { 
        loanId, 
        installmentNumber 
      });

      return transaction;
    } catch (error) {
      logger.error('Loan repayment failed:', error);
      throw error;
    }
  }

  /**
   * Unlock collateral after successful loan repayment
   */
  private async unlockCollateral(loanId: string): Promise<void> {
    const collateral = await prisma.collateral.findFirst({
      where: { loanId, status: 'LOCKED' },
    });

    if (!collateral) return;

    // Unlock time-lock in WDK
    await this.wdkClient.unlockTimeLock(collateral.timeLockId, 'loan_repaid');

    // Update database
    await prisma.collateral.update({
      where: { id: collateral.id },
      data: { status: 'UNLOCKED', unlockedAt: new Date() },
    });

    logger.info('Collateral unlocked successfully', { loanId });
  }

  /**
   * Get real-time vault balances
   */
  async getVaultBalances(userId: string): Promise<WDKVault[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { wallet: { include: { vaults: true } } },
      });

      if (!user?.wallet) throw new Error('User wallet not found');

      const balances: WDKVault[] = [];

      for (const vault of user.wallet.vaults) {
        const balance = await this.wdkClient.getVaultBalance(vault.address);
        balances.push(balance);
      }

      return balances;
    } catch (error) {
      logger.error('Failed to get vault balances:', error);
      throw error;
    }
  }

  /**
   * Health check for WDK integration
   */
  async healthCheck(): Promise<any> {
    const wdkHealth = await this.wdkClient.healthCheck();
    
    return {
      wdk: wdkHealth,
      manager: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

// Export singleton instance
export const wdkManager = new WDKManager({
  network: (process.env.WDK_NETWORK as 'mainnet' | 'testnet') || 'testnet',
  apiKey: process.env.WDK_API_KEY || '',
  rpcUrl: process.env.WDK_RPC_URL,
});
