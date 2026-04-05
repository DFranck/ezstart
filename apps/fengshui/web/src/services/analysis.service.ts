import { connectToMongo } from '@/lib/mongodb/connection'
import { AnalysisModel, type AnalysisDocument } from '@/models/analysis'
import { logger } from '@ezstart/logger'

export interface CreateAnalysisInput {
  userId: string
  planId: string
  name: string
  bearing: number
  results: Record<string, unknown>
}

/**
 * List analyses for a user, optionally filtered by planId.
 */
export async function listAnalyses(
  userId: string,
  limit: number,
  offset: number,
  planId?: string
): Promise<{ data: AnalysisDocument[]; total: number }> {
  await connectToMongo()

  const filter: Record<string, string> = { userId }
  if (planId) {
    filter.planId = planId
  }

  const [data, total] = await Promise.all([
    AnalysisModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean<AnalysisDocument[]>(),
    AnalysisModel.countDocuments(filter),
  ])

  return { data, total }
}

/**
 * Get a single analysis by ID.
 */
export async function getAnalysisById(
  analysisId: string,
  userId: string
): Promise<AnalysisDocument | null> {
  await connectToMongo()
  return AnalysisModel.findOne({ _id: analysisId, userId }).lean<AnalysisDocument>()
}

/**
 * Create a new analysis.
 */
export async function createAnalysis(
  input: CreateAnalysisInput
): Promise<AnalysisDocument> {
  await connectToMongo()

  const analysis = await AnalysisModel.create({
    userId: input.userId,
    planId: input.planId,
    name: input.name,
    bearing: input.bearing,
    results: input.results,
  })

  logger.info(
    `[analysis.service] Analysis created: ${analysis._id} for plan ${input.planId}`
  )
  return analysis.toObject()
}

/**
 * Delete an analysis.
 */
export async function deleteAnalysis(
  analysisId: string,
  userId: string
): Promise<boolean> {
  await connectToMongo()

  const result = await AnalysisModel.deleteOne({ _id: analysisId, userId })

  if (result.deletedCount > 0) {
    logger.info(`[analysis.service] Analysis deleted: ${analysisId}`)
    return true
  }

  return false
}
