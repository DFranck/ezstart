import { Model } from 'mongoose';
import { toApiObject } from './to-api-object';

export async function findWithQuery<T>(
  model: Model<any>,
  query: any = {},
  extraFilter: Record<string, any> = {},
  projection: Record<string, number> = {},
  sort: Record<string, 1 | -1> = { createdAt: -1 }
): Promise<T[]> {
  const {
    page = 1,
    limit = 20,
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

  const skip = (page - 1) * limit;

  const docs = await model
    .find(filter, projection)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  return docs.map(toApiObject);
}
