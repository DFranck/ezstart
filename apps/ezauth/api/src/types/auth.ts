import { z } from 'zod'

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

export type AuthUser = z.infer<typeof AuthUserSchema>

// Auth flow types
export const LoginRequestSchema = z.object({
  email: z.string().email(),
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

export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>
export type TokenRequest = z.infer<typeof TokenRequestSchema>
export type AuthToken = z.infer<typeof AuthTokenSchema>
export type AuthCode = z.infer<typeof AuthCodeSchema>

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

export type AppConfig = z.infer<typeof AppConfigSchema>

// JWT Payload
export interface JWTPayload {
  userId: string
  email: string
  username: string
  apps: string[]
  iat: number
  exp: number
}