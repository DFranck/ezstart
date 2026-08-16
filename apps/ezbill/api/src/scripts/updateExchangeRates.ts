import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import mongoose from 'mongoose'
import { updateAllExchangeRates } from '../cron/update-exchange-rates.js'

loadSharedEnv({ app: 'ezbill', layer: 'api', silent: true })
;(async () => {
  await mongoose.connect(getMongoUrl('ezbill'))
  await updateAllExchangeRates()
  await mongoose.disconnect()
  process.exit()
})()
