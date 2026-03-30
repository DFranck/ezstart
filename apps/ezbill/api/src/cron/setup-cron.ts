import cron from 'node-cron'
import { updateAllExchangeRates } from './update-exchange-rates.js'
import { logger } from '@ezstart/logger/server'

cron.schedule('10 3 */3 * *', async () => {
  logger.info('[CRON] Refreshing exchange rates...')
  await updateAllExchangeRates()
})

if (process.env.RUN_EXCHANGE_RATES_ON_START === 'true') {
  updateAllExchangeRates()
}
