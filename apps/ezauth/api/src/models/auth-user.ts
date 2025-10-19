import { connectToMongo } from '@ezstart/express-core'
import { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'
import { AuthUser } from '@ezstart/auth-sdk/server'

export interface AuthUserDocument extends Document {
  email: string
  username: string
  passwordHash: string
  firstName?: string
  lastName?: string
  avatar?: string
  isVerified: boolean
  apps: string[]
  createdAt: Date
  updatedAt: Date
  
  // Methods
  comparePassword(password: string): Promise<boolean>
  toAuthUser(): AuthUser
}

const authUserSchema = new Schema<AuthUserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 1,
    maxlength: 50,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  apps: [{
    type: String,
    enum: ['ezbill', 'tower-defense', 'admin', 'ezstart', 'green-pulse', 'fengshui', 'asc-tcd'], // Add more apps as needed
  }],
}, {
  timestamps: true,
  collection: 'auth_users', // Separate collection from other apps
  bufferCommands: false, // Disable buffering for fail-fast
})

// Hash password before saving
authUserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next()
  
  const salt = await bcrypt.genSalt(12)
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt)
  next()
})

// Compare password method
authUserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash)
}

// Transform to API object
authUserSchema.methods.toAuthUser = function(): AuthUser {
  return {
    _id: this._id.toString(),
    email: this.email,
    username: this.username,
    firstName: this.firstName,
    lastName: this.lastName,
    avatar: this.avatar,
    isVerified: this.isVerified,
    apps: this.apps,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  }
}

// Direct model export (requires mongoose to be initialized first)
let AuthUserModel: ReturnType<typeof import('mongoose').model<AuthUserDocument>>

/**
 * Factory function to get AuthUser model attached to shared connection
 * MUST be called after connectToMongo() has been initialized
 */
export async function getAuthUserModel() {
  const mongoose = await connectToMongo('ezauth')
  AuthUserModel = mongoose.models.AuthUser || mongoose.model<AuthUserDocument>('AuthUser', authUserSchema)
  return AuthUserModel
}

// Export model for direct use (will be undefined until getAuthUserModel is called)
export { AuthUserModel }