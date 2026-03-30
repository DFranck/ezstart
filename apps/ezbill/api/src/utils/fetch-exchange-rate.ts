import { logger } from '@ezstart/logger/server'

export async function fetchExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1
  const url = `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=1&access_key=${process.env.EXCHANGE_RATE_API_KEY}`
  logger.debug('URL:', url)
  const res = await fetch(url)
  const data = (await res.json()) as Record<string, unknown> & {
    error?: { type: string }
    info?: { rate?: number; quote?: number }
  }

  if (data.error && data.error.type === 'rate_limit_reached') {
    throw new Error(`API rate limit reached`)
  }
  if (!data.info || (data.info.rate === undefined && data.info.quote === undefined))
    throw new Error(`No rate/quote in response for ${from} → ${to} | raw: ${JSON.stringify(data)}`)

  return data.info.rate ?? data.info.quote
}
