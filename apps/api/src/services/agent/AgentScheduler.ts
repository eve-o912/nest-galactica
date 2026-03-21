import { Queue, Worker } from 'bullmq';
import { geminiAgent } from './GeminiAgent';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import Redis from 'ioredis';

/**
 * Agent Scheduler - Manages agent execution for all users
 * 
 * Schedules agent loops every 15 minutes for active users
 * Ensures agent continuously monitors and manages finances
 */
export class AgentScheduler {
  private queue: Queue;
  private worker: Worker;

  constructor() {
    // Create job queue
    this.queue = new Queue('agent-loops', {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    });

    // Create worker
    this.worker = new Worker(
      'agent-loops',
      async (job) => {
        const { userId } = job.data;
        await geminiAgent.executeAgentLoop(userId);
      },
      {
        connection: redis,
        concurrency: 10, // Process 10 users concurrently
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Schedule agent for all active users
   * Called by cron every 15 minutes
   */
  async scheduleAllUsers(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    logger.info(`Scheduling agent loops for ${users.length} users`);

    for (const user of users) {
      await this.queue.add(
        'agent-loop',
        { userId: user.id },
        { jobId: `agent-${user.id}-${Date.now()}` }
      );
    }
  }

  /**
   * Schedule immediate execution for specific user
   */
  async scheduleUser(userId: string): Promise<void> {
    await this.queue.add(
      'agent-loop',
      { userId },
      {
        jobId: `agent-${userId}-immediate`,
        priority: 1,
      }
    );
  }

  private setupEventHandlers(): void {
    this.worker.on('completed', (job: Job) => {
      logger.info('Agent loop completed', { userId: job.data.userId });
    });

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      logger.error('Agent loop failed', { userId: job?.data.userId, error });
    });
  }

  async close(): Promise<void> {
    await this.queue.close();
    await this.worker.close();
  }
}

export const agentScheduler = new AgentScheduler();

// Schedule loops every 15 minutes
setInterval(() => {
  agentScheduler.scheduleAllUsers();
}, 15 * 60 * 1000);
