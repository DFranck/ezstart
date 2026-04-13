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

export interface UsageBreakdownEntry {
  requests: number
  tokens: number
  cost: number
}

export interface UsageStatsResult {
  totalRequests: number
  totalTokens: number
  estimatedCost: number
  byProvider: Record<string, UsageBreakdownEntry>
  /** Omitted when filtered by a specific appName (redundant). */
  byApp?: Record<string, UsageBreakdownEntry>
}

export async function getUsageStats(
  appName?: string,
  days: number = 30
): Promise<UsageStatsResult> {
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
        cost: { $sum: '$estimatedCost' },
      },
    },
  ])

  const byProvider: Record<string, UsageBreakdownEntry> = {}
  for (const entry of byProviderAgg) {
    byProvider[entry._id] = {
      requests: entry.requests,
      tokens: entry.tokens,
      cost: entry.cost ?? 0,
    }
  }

  const result: UsageStatsResult = {
    totalRequests: stats?.totalRequests ?? 0,
    totalTokens: stats?.totalTokens ?? 0,
    estimatedCost: stats?.estimatedCost ?? 0,
    byProvider,
  }

  // Only include byApp breakdown when not filtered by a specific app
  if (!appName) {
    const byAppAgg = await AIUsage.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$appName',
          requests: { $sum: 1 },
          tokens: { $sum: '$tokensUsed.total' },
          cost: { $sum: '$estimatedCost' },
        },
      },
    ])

    const byApp: Record<string, UsageBreakdownEntry> = {}
    for (const entry of byAppAgg) {
      byApp[entry._id] = {
        requests: entry.requests,
        tokens: entry.tokens,
        cost: entry.cost ?? 0,
      }
    }

    result.byApp = byApp
  }

  return result
}
