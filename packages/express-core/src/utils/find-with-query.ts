import { toApiObject } from './to-api-object.js'

type FindWithQueryOptions = {
  extraFilter?: Record<string, any>
  projection?: Record<string, number>
  sort?: Record<string, 1 | -1>
  populate?: string[]
}

export async function findWithQuery<T>(
  model: any,
  query: any = {},
  {
    extraFilter = {},
    projection = {},
    sort = { createdAt: -1 },
    populate = [],
  }: FindWithQueryOptions = {}
): Promise<T[]> {
  const { page = 1, limit = 20, includeDeleted, deletedOnly, from, to, ...otherFilters } = query

  const filter: Record<string, any> = { ...extraFilter }

  if (includeDeleted) {
  } else if (deletedOnly) {
    filter.deletedAt = { $ne: null }
  } else {
    filter.deletedAt = null
  }

  if (from || to) {
    filter.createdAt = {}
    if (from) filter.createdAt.$gte = new Date(from)
    if (to) filter.createdAt.$lte = new Date(to)
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
  return docs.map(toApiObject)
}
