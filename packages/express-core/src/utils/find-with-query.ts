import { toApiObject } from './to-api-object.js'
import type { Model, FilterQuery } from 'mongoose'

type FindWithQueryOptions = {
  extraFilter?: FilterQuery<unknown>
  projection?: Record<string, number>
  sort?: Record<string, 1 | -1>
  populate?: string[]
}

type PaginatedQuery = {
  page?: number
  limit?: number
  includeDeleted?: boolean
  deletedOnly?: boolean
  from?: string
  to?: string
  [key: string]: unknown
}

export async function findWithQuery<T>(
  model: Model<T>,
  query: PaginatedQuery = {},
  {
    extraFilter = {},
    projection = {},
    sort = { createdAt: -1 },
    populate = [],
  }: FindWithQueryOptions = {}
): Promise<T[]> {
  const { page = 1, limit = 20, includeDeleted, deletedOnly, from, to, ...otherFilters } = query

  const filter: FilterQuery<T> = { ...extraFilter } as FilterQuery<T>

  if (includeDeleted) {
  } else if (deletedOnly) {
    filter.deletedAt = { $ne: null } as FilterQuery<T>[keyof FilterQuery<T>]
  } else {
    filter.deletedAt = null as FilterQuery<T>[keyof FilterQuery<T>]
  }

  if (from || to) {
    const dateFilter: { $gte?: Date; $lte?: Date } = {}
    if (from) dateFilter.$gte = new Date(from)
    if (to) dateFilter.$lte = new Date(to)
    filter.createdAt = dateFilter as FilterQuery<T>[keyof FilterQuery<T>]
  }

  Object.assign(filter, otherFilters)

  let queryBuilder = model
    .find(filter, projection)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)

  for (const path of populate) {
    queryBuilder = queryBuilder.populate(path)
  }

  const docs = await queryBuilder.exec()
  return docs.map(toApiObject<T>)
}
