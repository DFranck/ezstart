import { connectToMongo } from '@/lib/mongodb/connection'
import { PlanModel, type PlanDocument } from '@/models/plan'
import { logger } from '@ezstart/logger'

export interface CreatePlanInput {
  userId: string
  name: string
  imageData: string
  width: number
  height: number
}

export interface PlanListItem {
  _id: string
  name: string
  width: number
  height: number
  aiValidation: PlanDocument['aiValidation']
  createdAt: Date
  updatedAt: Date
}

/**
 * List plans for a user (without imageData for performance).
 */
export async function listPlans(
  userId: string,
  limit: number,
  offset: number
): Promise<{ data: PlanListItem[]; total: number }> {
  await connectToMongo()

  const [data, total] = await Promise.all([
    PlanModel.find({ userId })
      .select('-imageData')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean<PlanListItem[]>(),
    PlanModel.countDocuments({ userId }),
  ])

  return { data, total }
}

/**
 * Get a single plan by ID (includes imageData).
 */
export async function getPlanById(
  planId: string,
  userId: string
): Promise<PlanDocument | null> {
  await connectToMongo()
  return PlanModel.findOne({ _id: planId, userId }).lean<PlanDocument>()
}

/**
 * Create a new plan.
 */
export async function createPlan(input: CreatePlanInput): Promise<PlanDocument> {
  await connectToMongo()

  const plan = await PlanModel.create({
    userId: input.userId,
    name: input.name,
    imageData: input.imageData,
    width: input.width,
    height: input.height,
    aiValidation: null,
  })

  logger.info(`[plan.service] Plan created: ${plan._id} for user ${input.userId}`)
  return plan.toObject()
}

/**
 * Update AI validation results on a plan.
 */
export async function updatePlanValidation(
  planId: string,
  userId: string,
  validation: NonNullable<PlanDocument['aiValidation']>
): Promise<PlanDocument | null> {
  await connectToMongo()

  return PlanModel.findOneAndUpdate(
    { _id: planId, userId },
    { $set: { aiValidation: validation } },
    { new: true }
  )
    .select('-imageData')
    .lean<PlanDocument>()
}

/**
 * Delete a plan and its associated analyses.
 */
export async function deletePlan(
  planId: string,
  userId: string
): Promise<boolean> {
  await connectToMongo()

  const result = await PlanModel.deleteOne({ _id: planId, userId })

  if (result.deletedCount > 0) {
    logger.info(`[plan.service] Plan deleted: ${planId}`)
    // Also delete associated analyses
    const { AnalysisModel } = await import('@/models/analysis')
    await AnalysisModel.deleteMany({ planId, userId })
    return true
  }

  return false
}
