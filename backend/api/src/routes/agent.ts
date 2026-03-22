import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { geminiAgent } from '../services/agent/GeminiAgent';

const router = Router() as Router;

// Validation schemas
const chatMessageSchema = z.object({
  message: z.string().min(1).max(1000),
});

// Chat with AI agent
router.post('/chat', authenticate, validate(chatMessageSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    const userId = req.user!.id;

    // Record user message
    await prisma.conversationHistory.create({
      data: {
        userId,
        role: 'user',
        content: message,
      },
    });

    // Get AI response using Gemini
    const response = await geminiAgent.getAIResponse(userId, message);
    
    // Record AI response
    await prisma.conversationHistory.create({
      data: {
        userId,
        role: 'assistant',
        content: response,
      },
    });

    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Get conversation history
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = '50' } = req.query;

    const history = await prisma.conversationHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

// Get agent decisions
router.get('/decisions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const decisions = await prisma.agentDecision.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ decisions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch agent decisions' });
  }
});

export default router;
