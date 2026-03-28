import { Currency, currencyEnum } from '@ezbill/types';
import { getExchangeRateModel } from '../models/billing/exchange-rate.js';
import { fetchExchangeRate } from '../utils/fetch-exchange-rate.js';
import { logger } from '@ezstart/logger/server';
const pairs: [Currency, Currency][] = currencyEnum.options
  .filter((c) => c !== 'USD')
  .map((c) => [c as Currency, 'USD' as Currency]);

export async function updateAllExchangeRates() {
  const ExchangeRate = await getExchangeRateModel();
  for (const [from, to] of pairs) {
    try {
      const rate = await fetchExchangeRate(from, to);
      await ExchangeRate.create({
        from,
        to,
        rate,
        source: 'exchangerate.host',
        fetchedAt: new Date(),
      });
      logger.info(`✔️ Updated: ${from} → ${to} = ${rate}`);
    } catch (err) {
      if (err instanceof Error) {
        logger.error(`❌ Error updating ${from} → ${to}:`, err.message);
        if (err.message.includes('rate limit')) break;
      } else {
        logger.error(`❌ Error updating ${from} → ${to}:`, err);
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
}
