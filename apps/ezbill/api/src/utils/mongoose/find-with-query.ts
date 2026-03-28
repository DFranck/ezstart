import { Model } from 'mongoose';
import { toApiObject } from './to-api-object.js';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

function buildFilter(query: any, extraFilter: Record<string, any>) {
  const {
    page,
    limit,
    includeDeleted,
    deletedOnly,
    from,
    to,
    ...otherFilters
  } = query;

  const filter: Record<string, any> = { ...extraFilter };

  if (includeDeleted) {
  } else if (deletedOnly) {
    filter.deletedAt = { $ne: null };
  } else {
    filter.deletedAt = null;
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  Object.assign(filter, otherFilters);
  return filter;
}

export async function findWithQuery<T>(
  model: Model<any>,
  query: any = {},
  extraFilter: Record<string, any> = {},
  projection: Record<string, number> = {},
  sort: Record<string, 1 | -1> = { createdAt: -1 }
): Promise<T[]> {
  const { page = 1, limit = 20 } = query;
  const filter = buildFilter(query, extraFilter);
  const skip = (page - 1) * limit;

  const docs = await model
    .find(filter, projection)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  return docs.map(toApiObject);
}

export async function findWithQueryPaginated<T>(
  model: Model<any>,
  query: any = {},
  extraFilter: Record<string, any> = {},
  projection: Record<string, number> = {},
  sort: Record<string, 1 | -1> = { createdAt: -1 }
): Promise<PaginatedResult<T>> {
  const { page = 1, limit = 20 } = query;
  const filter = buildFilter(query, extraFilter);
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    model.find(filter, projection).sort(sort).skip(skip).limit(limit),
    model.countDocuments(filter),
  ]);

  return {
    data: docs.map(toApiObject),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
