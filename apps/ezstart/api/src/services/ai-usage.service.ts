import { logger } from '@ezstart/logger/server'
import { AIUsage } from '../models/AIUsage.js'

export async function trackAIUsage(data: {
  appName: string
  providerId: string
  providerType?: string
  model?: string
  userId?: string
  conversationId?: string
  promptType?: string
  tokensUsed?: { prompt: number; completion: number; total: number }
  responseTime: number
  success: boolean
  errorMessage?: string
}): Promise<void> {
  try {
    await AIUsage.create({
      appName: data.appName,
      providerId: data.providerId,
      providerType: data.providerType,
      model: data.model,
      userId: data.userId,
      conversationId: data.conversationId,
      promptType: data.promptType || 'general',
      tokensUsed: data.tokensUsed || { prompt: 0, completion: 0, total: 0 },
      responseTime: data.responseTime,
      success: data.success,
      errorMessage: data.errorMessage,
    })
  } catch (error) {
    logger.error('[AI Usage] Failed to track usage:', error)
  }
}

export async function getUsageStats(
  appName?: string,
  days: number = 30
): Promise<{
  totalRequests: number
  totalTokens: number
  estimatedCost: number
  byProvider: Record<string, { requests: number; tokens: number }>
}> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const match: Record<string, unknown> = { createdAt: { $gte: since } }
  if (appName) match.appName = appName

  const [stats] = await AIUsage.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        totalTokens: { $sum: '$tokensUsed.total' },
        estimatedCost: { $sum: '$estimatedCost' },
      },
    },
  ])

  const byProviderAgg = await AIUsage.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$providerId',
        requests: { $sum: 1 },
        tokens: { $sum: '$tokensUsed.total' },
      },
    },
  ])

  const byProvider: Record<string, { requests: number; tokens: number }> = {}
  for (const entry of byProviderAgg) {
    byProvider[entry._id] = { requests: entry.requests, tokens: entry.tokens }
  }

  return {
    totalRequests: stats?.totalRequests ?? 0,
    totalTokens: stats?.totalTokens ?? 0,
    estimatedCost: stats?.estimatedCost ?? 0,
    byProvider,
  }
}
