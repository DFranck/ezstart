import ExchangeRate from '../models/billing/exchange-rate';

export async function getLatestExchangeRate(from: string, to: string) {
  const doc = await ExchangeRate.findOne({ from, to })
    .sort({ fetchedAt: -1 })
    .lean();
  if (!doc) return null;
  const { from: f, to: t, rate, source, fetchedAt } = doc;
  console.log('getLatestExchangeRate', {
    from: f,
    to: t,
    rate,
    source,
    fetchedAt,
  });
  return { from: f, to: t, rate, source, fetchedAt };
}
