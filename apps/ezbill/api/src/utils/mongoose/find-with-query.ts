import { Model } from 'mongoose'
import { toApiObject } from './to-api-object.js'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

function buildFilter(query: Record<string, unknown>, extraFilter: Record<string, unknown>) {
  const { page, limit, includeDeleted, deletedOnly, from, to, ...otherFilters } = query

  const filter: Record<string, unknown> = { ...extraFilter }

  if (includeDeleted) {
  } else if (deletedOnly) {
    filter.deletedAt = { $ne: null }
  } else {
    filter.deletedAt = null
  }

  if (from || to) {
    const createdAt: Record<string, Date> = {}
    if (from) createdAt.$gte = new Date(String(from))
    if (to) createdAt.$lte = new Date(String(to))
    filter.createdAt = createdAt
  }

  Object.assign(filter, otherFilters)
  return filter
}

export async function findWithQuery<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose Model generic requires any for flexibility
  model: Model<any>,
  query: Record<string, unknown> = {},
  extraFilter: Record<string, unknown> = {},
  projection: Record<string, number> = {},
  sort: Record<string, 1 | -1> = { createdAt: -1 }
): Promise<T[]> {
  const { page = 1, limit = 20 } = query
  const filter = buildFilter(query, extraFilter)
  const skip = (Number(page) - 1) * Number(limit)

  const docs = await model.find(filter, projection).sort(sort).skip(skip).limit(Number(limit))

  return docs.map(toApiObject)
}

export async function findWithQueryPaginated<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose Model generic requires any for flexibility
  model: Model<any>,
  query: Record<string, unknown> = {},
  extraFilter: Record<string, unknown> = {},
  projection: Record<string, number> = {},
  sort: Record<string, 1 | -1> = { createdAt: -1 }
): Promise<PaginatedResult<T>> {
  const { page = 1, limit = 20 } = query
  const filter = buildFilter(query, extraFilter)
  const skip = (Number(page) - 1) * Number(limit)

  const [docs, total] = await Promise.all([
    model.find(filter, projection).sort(sort).skip(skip).limit(Number(limit)),
    model.countDocuments(filter),
  ])

  return {
    data: docs.map(toApiObject),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  }
}
