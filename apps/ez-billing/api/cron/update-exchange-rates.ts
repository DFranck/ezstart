import { Currency, currencyEnum } from '@ezstart/types';
import ExchangeRate from '../models/billing/exchange-rate';
import { fetchExchangeRate } from '../utils/fetch-exchange-rate';
const pairs: [Currency, Currency][] = currencyEnum.options
  .filter((c) => c !== 'USD')
  .map((c) => [c as Currency, 'USD' as Currency]);

export async function updateAllExchangeRates() {
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
      console.log(`✔️ Updated: ${from} → ${to} = ${rate}`);
    } catch (err) {
      if (err instanceof Error) {
        console.error(`❌ Error updating ${from} → ${to}:`, err.message);
        if (err.message.includes('rate limit')) break;
      } else {
        console.error(`❌ Error updating ${from} → ${to}:`, err);
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
  }
}
