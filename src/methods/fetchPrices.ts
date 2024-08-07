import { DEVIATION_THRESHOLD_PERCENT, MINIMUM_SOURCES, TRADE_AGE_LIMIT } from "../constants"
import { PriceInfo, FetchPricesParams } from "../types"
import { fetchPrice } from "../utils/fetch"
import { median, normalize, percentDifference } from "../utils/math"

export async function fetchPrices(params: FetchPricesParams): Promise<PriceInfo[]> {
  console.log("Starting fetchPrices with params:", JSON.stringify(params))

  const deviationThresholdPercent = params.deviationThresholdPercent || DEVIATION_THRESHOLD_PERCENT
  const tradeAgeLimit = params.tradeAgeLimit || TRADE_AGE_LIMIT
  const minimumSources = params.minimumSources || MINIMUM_SOURCES

  console.log(
    `Using deviation threshold: ${deviationThresholdPercent}%, trade age limit: ${tradeAgeLimit}ms, minimum sources: ${minimumSources}`
  )

  const results = await Promise.all(
    params.pairs.map(async (pair) => {
      try {
        const priceData = await fetchPrice(pair.from, pair.to, params.exchanges, tradeAgeLimit)
        const prices = priceData.map((data) => data.price)

        if (prices.length === 0) {
          console.warn(`No valid prices fetched for ${pair.from}-${pair.to}`)
          return null // Return null for pairs with no valid prices
        } else if (prices.length < minimumSources) {
          console.warn(
            `Not enough sources for ${pair.from}-${pair.to}, ${prices.length} / ${minimumSources} sources fetched`
          )
          return null // Return null for pairs with not enough sources
        }

        console.log(`Fetched ${prices.length} valid prices for ${pair.from}-${pair.to}`)

        // Calculate median price
        const medianPrice = normalize(median(prices))
        console.log(`Calculated median price for ${pair.from}-${pair.to}: ${medianPrice}`)

        const sources = priceData.map((data) => ({ exchangeId: data.exchangeId, certificate: data.certificate }))

        let finalPrice = medianPrice

        // Check if we should use the client-provided price
        if (pair.price !== undefined) {
          const deviation = percentDifference(medianPrice, pair.price)
          console.log(`Deviation between median and client price: ${deviation}%`)

          if (deviation <= deviationThresholdPercent) {
            console.log(`Price withing threshold , using client-provided price for ${pair.from}-${pair.to}`)
            finalPrice = pair.price
          } else {
            console.log(`Client price deviation too high, using oracle price for ${pair.from}-${pair.to}`)
          }
        }

        const priceInfo: PriceInfo = {
          from: pair.from,
          to: pair.to,
          price: finalPrice,
          timestamp: Math.floor(Date.now() / 1000),
          sources,
        }

        console.log(`Final price info for ${pair.from}-${pair.to}:`, JSON.stringify(priceInfo))
        return priceInfo
      } catch (error) {
        console.error(`❌ Error fetching price for ${pair.from}-${pair.to}:`, error)
        return null // Return null for pairs with errors
      }
    })
  )

  // Filter out null results
  const validResults = results.filter((result): result is PriceInfo => result !== null)
  console.log(`Fetched valid prices for ${validResults.length} out of ${params.pairs.length} pairs`)

  return validResults
}
