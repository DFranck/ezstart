export function toApiObject<T = any>(doc: any): T {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;

  return {
    ...obj,
    _id: obj._id?.toString(),
    createdAt:
      typeof obj.createdAt === 'string'
        ? obj.createdAt
        : obj.createdAt?.toISOString(),
    updatedAt:
      typeof obj.updatedAt === 'string'
        ? obj.updatedAt
        : obj.updatedAt?.toISOString(),
    deletedAt: obj.deletedAt ?? undefined,
  };
}
