export function toApiObject<T = any>(doc: any): T {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;

  return {
    ...obj,
    _id: obj._id?.toString(),
    createdAt: obj.createdAt ? obj.createdAt.toISOString() : undefined,
    updatedAt: obj.updatedAt ? obj.updatedAt.toISOString() : undefined,
    deletedAt: obj.deletedAt ?? undefined,
  };
}
