import { getExchangeRateModel } from '../models/billing/exchange-rate.js';
import { logger } from '@ezstart/logger/server';

export async function getLatestExchangeRate(from: string, to: string) {
  const ExchangeRate = await getExchangeRateModel();
  const doc = await ExchangeRate.findOne({ from, to })
    .sort({ fetchedAt: -1 })
    .lean();
  if (!doc) return null;
  const { from: f, to: t, rate, source, fetchedAt } = doc;
  logger.debug('getLatestExchangeRate', {
    from: f,
    to: t,
    rate,
    source,
    fetchedAt,
  });
  return { from: f, to: t, rate, source, fetchedAt };
}
