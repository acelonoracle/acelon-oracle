import { CONFIGS } from "../config/exchanges"
import { ExchangeConfig } from "../types"
import { cache } from "./cache"

declare const httpGET: any

// Fetches price data for a given currency pair from multiple exchanges
export async function fetchPrice(
  from: string,
  to: string,
  exchanges?: string[],
  tradeAgeLimit?: number
): Promise<Array<{ price: number; exchangeId: string; certificate: string }>> {
  console.log(`👀 Fetching price for ${from}-${to}`)

  // Filter configs based on specified exchanges (if any)
  const filteredConfigs = exchanges ? CONFIGS.filter((config) => exchanges.includes(config.exchange_id)) : CONFIGS
  console.log(
    `Using ${filteredConfigs.length} exchange configs : ${filteredConfigs.map((config) => config.name).join(", ")}`
  )

  // Check cache for existing entries
  const cachedEntries = cache.getAll(from, to, exchanges)
  const cachedExchangeIds = new Set(cachedEntries.flatMap((entry) => entry.sources.map((source) => source.exchangeId)))

  // Determine which configs need to be fetched (not in cache)
  const configsToFetch = filteredConfigs.filter((config) => !cachedExchangeIds.has(config.exchange_id))
  console.log(
    `Fetching from ${configsToFetch.length} exchanges : ${configsToFetch.map((config) => config.name).join(", ")}`
  )

  // Fetch prices from APIs for non-cached exchanges
  const promises = configsToFetch.map((config) => fetch(config, from, to, tradeAgeLimit))
  const results = await Promise.allSettled(promises)

  // Process fetched results
  const fetchedResults = results
    .filter((result): result is PromiseFulfilledResult<{ price: number; exchangeId: string; certificate: string }> => {
      if (result.status === "rejected") {
        console.error(`Error fetching price for ${from}-${to} from exchange:`, result.reason)
        return false
      }
      return true
    })
    .map((result) => result.value)

  console.log(`✅ Successfully fetched ${fetchedResults.length} new prices`)

  // Combine cached and fetched results
  return [
    ...cachedEntries.flatMap((entry) =>
      entry.sources.map((source) => ({
        price: entry.price,
        exchangeId: source.exchangeId,
        certificate: source.certificate,
      }))
    ),
    ...fetchedResults,
  ]
}

// Fetches price data from a specific exchange
async function fetch(
  config: ExchangeConfig,
  from: string,
  to: string,
  tradeAgeLimit?: number
): Promise<{ price: number; exchangeId: string; certificate: string }> {
  return new Promise((resolve, reject) => {
    console.log(`🌍 Fetching price from ${config.name} for ${from}-${to}`)

    // Check cache first
    const cachedEntry = cache.get(from, to, config.exchange_id)
    if (cachedEntry) {
      resolve({
        price: cachedEntry.price,
        exchangeId: config.exchange_id,
        certificate: cachedEntry.sources[0].certificate,
      })
      return
    }

    // Fetch from API if not in cache
    httpGET(
      config.constructURL(from, to),
      {
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.52 Safari/537.36",
      },
      (rawResponse: string, certificate: string) => {
        try {
          console.log(`Received response from ${config.name}`)
          const response = JSON.parse(rawResponse)
          const priceData = config.extractPriceData(response)
          console.log(`Extracted price data from ${config.name}: ${JSON.stringify(priceData)}`)

          if (isNaN(priceData.price)) {
            throw new Error(`Invalid price data from ${config.name}: ${priceData.price}`)
          }

          if (tradeAgeLimit && Date.now() - priceData.timestamp > tradeAgeLimit) {
            console.log(`🚨 Trade age exceeds limit for ${config.name}`)
            reject(new Error(`Trade age exceeds limit for ${config.name}`))
          } else {
            // Cache the fetched price
            cache.set(from, to, config.exchange_id, priceData.price, certificate)
            resolve({
              price: priceData.price,
              exchangeId: config.exchange_id,
              certificate,
            })
          }
        } catch (error) {
          console.error(`❌ Error processing response from ${config.name}:`, error)
          reject(error)
        }
      },
      (errorMessage: string) => {
        console.error(`❌ HTTP GET error for ${config.name}:`, errorMessage)
        reject(new Error(`${config.name}: ${errorMessage}`))
      }
    )
  })
}
