import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export class WebSocketManager {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
        
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, status: true }
        });

        if (!user || user.status !== 'ACTIVE') {
          return next(new Error('Invalid token'));
        }

        socket.userId = user.id;
        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info('Client connected', { userId: socket.userId, socketId: socket.id });

      // Join user-specific room
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }

      // Handle chat messages with AI agent
      socket.on('chat_message', async (data) => {
        try {
          const { message } = data;
          
          // Record user message
          await prisma.conversationHistory.create({
            data: {
              userId: socket.userId!,
              role: 'user',
              content: message,
            },
          });

          // Get AI response (simplified - would use AutonomousAgent)
          const aiResponse = await this.getAIResponse(socket.userId!, message);
          
          // Record AI response
          await prisma.conversationHistory.create({
            data: {
              userId: socket.userId!,
              role: 'assistant',
              content: aiResponse,
            },
          });

          // Send response back to user
          socket.emit('chat_response', {
            message: aiResponse,
            timestamp: new Date().toISOString(),
          });

        } catch (error) {
          logger.error('Chat message error:', error);
          socket.emit('error', { message: 'Failed to process message' });
        }
      });

      // Handle real-time updates
      socket.on('subscribe_updates', (data) => {
        const { types } = data;
        
        // Join rooms for different update types
        types.forEach((type: string) => {
          socket.join(`${type}:${socket.userId}`);
        });
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected', { userId: socket.userId, socketId: socket.id });
      });
    });
  }

  /**
   * Send notification to specific user
   */
  async sendNotification(userId: string, notification: any): Promise<void> {
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send real-time updates
   */
  async sendUpdate(userId: string, type: string, data: any): Promise<void> {
    this.io.to(`${type}:${userId}`).emit('update', {
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  private async getAIResponse(userId: string, message: string): Promise<string> {
    // Simplified AI response - in production would use AutonomousAgent
    // This is a placeholder implementation
    
    const responses = [
      "I understand your financial goals. Let me analyze your current situation.",
      "Based on your spending patterns, I recommend adjusting your emergency fund allocation.",
      "I can help you create a plan to reach your savings goal faster.",
      "Your financial health looks good. Here are some optimization opportunities...",
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }
}
