import console from 'console';
import 'dotenv/config';
import cron from 'node-cron';
import { updateAllExchangeRates } from './update-exchange-rates';

cron.schedule('10 3 */3 * *', async () => {
  console.log('[CRON] Refreshing exchange rates...');
  await updateAllExchangeRates();
});

if (process.env.RUN_EXCHANGE_RATES_ON_START === 'true') {
  updateAllExchangeRates();
}
