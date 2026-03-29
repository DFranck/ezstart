/** Recursive type representing any valid JSON value */
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json }

/** A JSON object (not a primitive or array at root level) */
export type JsonObject = { [key: string]: Json }

/** A JSON API response — either an object or array */
export type JsonResponse = JsonObject | Json[]
