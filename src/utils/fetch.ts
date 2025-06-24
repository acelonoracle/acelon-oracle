import { log } from './sentry'
import { fetchDexPrice } from './fetchDex'
import { fetchCexPrice } from './fetchCex'
import { isDexPairSupported } from '../config/dexes'

/**
 * Fetches price data for a given currency pair.
 * Routes to either DEX or CEX price fetching based on pair support.
 */
export async function fetchPrice(
  from: string,
  to: string,
  exchanges?: string[],
  tradeAgeLimit?: number
): Promise<Array<{ price: number; exchangeId: string; certificate: string }>> {
  // Check if this pair is supported by DEX
  const isDexSupported = isDexPairSupported(from, to)
  
  if (isDexSupported) {
    log(`👀 Fetching DEX price for ${from}-${to}`)
    return fetchDexPrice(from, to, tradeAgeLimit)
  }

  // Route to CEX price fetching for unsupported DEX pairs
  log(`👀 Routing to CEX price fetching for ${from}-${to}`)
  return fetchCexPrice(from, to, exchanges, tradeAgeLimit)
}
