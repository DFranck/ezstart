import type { Model, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose'

/**
 * Typed wrappers for Mongoose queries that avoid the union type inference issue.
 * Mongoose 8.x query methods return complex union types that TypeScript struggles to resolve
 * when models use discriminated unions or complex schema types.
 *
 * Usage: `findById(MyModel, id)` instead of `(MyModel.findById as any)(id)`
 */

export function findById<T>(model: Model<T>, id: unknown, options?: QueryOptions) {
  return (model.findById as Function)(id, null, options)
}

export function findOne<T>(model: Model<T>, filter: FilterQuery<T>, options?: QueryOptions) {
  return (model.findOne as Function)(filter, null, options)
}

export function findMany<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  projection?: unknown,
  options?: QueryOptions
) {
  return (model.find as Function)(filter, projection, options)
}

export function findByIdAndUpdate<T>(
  model: Model<T>,
  id: unknown,
  update: UpdateQuery<T>,
  options?: QueryOptions
) {
  return (model.findByIdAndUpdate as Function)(id, update, options)
}

export function findOneAndUpdate<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  update: UpdateQuery<T>,
  options?: QueryOptions
) {
  return (model.findOneAndUpdate as Function)(filter, update, options)
}

export function findByIdAndDelete<T>(model: Model<T>, id: unknown, options?: QueryOptions) {
  return (model.findByIdAndDelete as Function)(id, options)
}

export function findOneAndDelete<T>(
  model: Model<T>,
  filter: FilterQuery<T>,
  options?: QueryOptions
) {
  return (model.findOneAndDelete as Function)(filter, options)
}

export function countDocuments<T>(model: Model<T>, filter: FilterQuery<T>) {
  return (model.countDocuments as Function)(filter)
}
