interface MongooseDoc {
  toObject?: () => Record<string, unknown>
  _id?: { toString(): string }
  createdAt?: string | { toISOString(): string }
  updatedAt?: string | { toISOString(): string }
  deletedAt?: unknown
  [key: string]: unknown
}

export function toApiObject<T = Record<string, unknown>>(doc: MongooseDoc): T {
  if (!doc) return doc as T
  const obj = (doc.toObject ? doc.toObject() : doc) as MongooseDoc

  return {
    ...obj,
    _id: obj._id?.toString(),
    createdAt:
      typeof obj.createdAt === 'string'
        ? obj.createdAt
        : (obj.createdAt as { toISOString(): string } | undefined)?.toISOString(),
    updatedAt:
      typeof obj.updatedAt === 'string'
        ? obj.updatedAt
        : (obj.updatedAt as { toISOString(): string } | undefined)?.toISOString(),
    deletedAt: obj.deletedAt ?? undefined,
  } as T
}
