import { z, type Infer as ZodInfer } from '@ezstart/types'

// EZAuth Types - Centralized Authentication System
// User types
export const AuthUserSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  username: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  avatar: z.string().optional(),
  isVerified: z.boolean().default(false),
  apps: z.array(z.string()).default([]), // Apps this user has access to
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type AuthUser = ZodInfer<typeof AuthUserSchema>

// Auth flow types
export const LoginRequestSchema = z.object({
  email: z.string().min(1), // Can be email or username
  password: z.string().min(6),
  app: z.string().min(1), // App requesting auth (ez-billing, tower-defense, etc.)
  redirect_uri: z.string().url().optional(),
})

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(50),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  app: z.string().min(1),
  redirect_uri: z.string().url().optional(),
})

export const TokenRequestSchema = z.object({
  code: z.string().min(1),
  app: z.string().min(1),
  redirect_uri: z.string().url().optional(),
})

// Response types
export const AuthTokenSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  user: AuthUserSchema,
})

export const AuthCodeSchema = z.object({
  code: z.string(),
  expires_at: z.string(),
})

export const AuthResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
})

export const UserResponseSchema = AuthResponseSchema.extend({
  user: AuthUserSchema.optional(),
})

export const TokenVerifyResponseSchema = AuthResponseSchema.extend({
  valid: z.boolean(),
  payload: z.object({
    userId: z.string(),
    email: z.string(),
    username: z.string(),
    apps: z.array(z.string()),
    exp: z.number(),
  }).optional(),
})

export type LoginRequest = ZodInfer<typeof LoginRequestSchema>
export type RegisterRequest = ZodInfer<typeof RegisterRequestSchema>
export type TokenRequest = ZodInfer<typeof TokenRequestSchema>
export type AuthToken = ZodInfer<typeof AuthTokenSchema>
export type AuthCode = ZodInfer<typeof AuthCodeSchema>
export type AuthResponse = ZodInfer<typeof AuthResponseSchema>
export type UserResponse = ZodInfer<typeof UserResponseSchema>
export type TokenVerifyResponse = ZodInfer<typeof TokenVerifyResponseSchema>

// App registration
export const AppConfigSchema = z.object({
  _id: z.string(),
  name: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  redirectUris: z.array(z.string().url()),
  allowedOrigins: z.array(z.string()),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type AppConfig = ZodInfer<typeof AppConfigSchema>

// JWT Payload
export interface JWTPayload {
  userId: string
  email: string
  username: string
  apps: string[]
  iat: number
  exp: number
}