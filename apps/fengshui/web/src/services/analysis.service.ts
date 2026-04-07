import { connectToMongo } from '@/lib/mongodb/connection'
import { AnalysisModel, type AnalysisDocument } from '@/models/analysis'
import { logger } from '@ezstart/logger'

export interface CreateAnalysisInput {
  userId: string
  planId: string
  name: string
  bearing: number
  results: Record<string, unknown>
  imageData?: string
}

/**
 * List analyses for a user, optionally filtered by planId.
 */
export async function listAnalyses(
  userId: string,
  limit: number,
  offset: number,
  planId?: string,
  isAdmin?: boolean,
  filterUserId?: string
): Promise<{ data: AnalysisDocument[]; total: number }> {
  await connectToMongo()

  const filter: Record<string, string> = {}

  if (isAdmin && filterUserId) {
    filter.userId = filterUserId
  } else if (!isAdmin) {
    filter.userId = userId
  }
  // If admin without filterUserId, no userId filter = all analyses

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
  userId?: string
): Promise<AnalysisDocument | null> {
  await connectToMongo()
  const filter: Record<string, string> = { _id: analysisId }
  if (userId) filter.userId = userId
  return AnalysisModel.findOne(filter).lean<AnalysisDocument>()
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
    imageData: input.imageData || null,
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
