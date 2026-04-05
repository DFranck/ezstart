import { NextResponse } from 'next/server'

/**
 * Standardized API success response.
 */
export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, data, ...(meta ? { meta } : {}) }, { status })
}

/**
 * Standardized API error response.
 */
export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}
