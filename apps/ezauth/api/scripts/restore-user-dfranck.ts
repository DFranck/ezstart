/**
 * Script de récupération d'urgence - Recrée le user DFranck
 *
 * USAGE:
 *   cd apps/ezauth/api
 *   tsx scripts/restore-user-dfranck.ts
 *
 * Ce script recrée le user avec le MÊME _id pour que la Company EZBill fonctionne
 */

import { connectToMongo } from '@ezstart/express-core'
import { getUserModel } from '../src/models/user.js'
import { Types } from 'mongoose'
import bcrypt from 'bcrypt'

async function restoreUserDFranck() {
  console.log('🔧 Connecting to MongoDB...')
  await connectToMongo('ezauth')

  const User = await getUserModel()

  // ID exact du user référencé par ta Company
  const userId = new Types.ObjectId('68be4f9ccbb1d1be4dc05135')

  // Vérifier si le user existe déjà
  const existing = await User.findById(userId)
  if (existing) {
    console.log('✅ User DFranck already exists!')
    console.log(existing)
    process.exit(0)
  }

  console.log('⚠️  User DFranck not found. Recreating...')

  // Hash du mot de passe
  // ⚠️ CHANGE CE MOT DE PASSE AVANT D'EXÉCUTER LE SCRIPT !
  const password = 'YourSecurePassword123!' // ← Change ici
  const hashedPassword = await bcrypt.hash(password, 10)

  // Recréer le user avec le MÊME _id
  const restoredUser = await User.create({
    _id: userId,
    username: 'DFranck',
    email: 'franckdufournetpro@gmail.com',
    password: hashedPassword,
    createdAt: new Date('2025-09-02T07:32:05.746Z'), // Date originale
    updatedAt: new Date(),
  })

  console.log('✅ User DFranck restored successfully!')
  console.log({
    _id: restoredUser._id,
    username: restoredUser.username,
    email: restoredUser.email,
  })

  process.exit(0)
}

restoreUserDFranck().catch((error) => {
  console.error('❌ Error restoring user:', error)
  process.exit(1)
})
