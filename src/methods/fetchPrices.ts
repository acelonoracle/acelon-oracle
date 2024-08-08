import { AGGREGATION_TYPE, DEVIATION_THRESHOLD_PERCENT, MINIMUM_SOURCES, TRADE_AGE_LIMIT } from "../constants"
import { PriceInfo, FetchPricesParams, AggregationType } from "../types"
import { fetchPrice } from "../utils/fetch"
import { aggregatePrice, normalize, relativePriceDifference, standardDeviation } from "../utils/math"

export async function fetchPrices(params: FetchPricesParams): Promise<PriceInfo[]> {
  console.log("Starting fetchPrices with params:", JSON.stringify(params))

  const maxValidationDiffPercent = params.maxValidationDiff || DEVIATION_THRESHOLD_PERCENT
  const tradeAgeLimit = params.tradeAgeLimit || TRADE_AGE_LIMIT
  const minSources = params.minSources || MINIMUM_SOURCES
  const mainAggregationType = params.aggregation || AGGREGATION_TYPE
  const maxSourcesDeviation = params.maxSourcesDeviation

  const aggregationTypes: AggregationType[] = Array.from(
    new Set([mainAggregationType, ...(params.additionalAggregations || [])])
  )

  console.log(
    `Using deviation threshold: ${maxValidationDiffPercent}%, trade age limit: ${tradeAgeLimit}ms, minimum sources: ${minSources}, main aggregation type: ${mainAggregationType}, all aggregation types: ${aggregationTypes.join(", ")}`
  )

  const results = await Promise.all(
    params.pairs.map(async (pair) => {
      try {
        const priceData = await fetchPrice(pair.from, pair.to, params.exchanges, tradeAgeLimit)
        const prices = priceData.map((data) => data.price)

        if (prices.length === 0) {
          throw new Error(`No valid prices fetched for ${pair.from}-${pair.to}`)
        } else if (prices.length < minSources) {
          throw new Error(
            `Not enough sources for ${pair.from}-${pair.to}, ${prices.length} / ${minSources} sources fetched`
          )
        }

        // Calculate standard deviation
        const stdDev = standardDeviation(prices)

        // Check if standard deviation exceeds the maximum allowed
        if (maxSourcesDeviation !== undefined && stdDev > maxSourcesDeviation) {
          throw new Error(
            `Standard deviation (${stdDev}) exceeds maximum allowed (${maxSourcesDeviation}) for ${pair.from}-${pair.to}`
          )
        }

        console.log(`Fetched ${prices.length} valid prices for ${pair.from}-${pair.to}`)

        // Calculate additional aggregations if requested
        let aggregations: Partial<Record<AggregationType, number>> | undefined = undefined
        if (params.additionalAggregations && aggregationTypes.length > 1) {
          aggregations = {}
          for (const aggType of aggregationTypes) {
            aggregations[aggType] = normalize(aggregatePrice(prices, aggType))
          }
        }

        const sources = priceData.map((data) => ({ exchangeId: data.exchangeId, certificate: data.certificate }))

        // Set the main price
        let mainPrice = normalize(aggregatePrice(prices, mainAggregationType))

        // Check if we should use the client-provided price
        if (pair.price !== undefined) {
          const deviation = relativePriceDifference(mainPrice, pair.price)
          console.log(`Deviation between ${mainAggregationType} and client price: ${deviation}%`)

          if (deviation <= maxValidationDiffPercent) {
            console.log(`Price within threshold, using client-provided price for ${pair.from}-${pair.to}`)
            mainPrice = pair.price
          } else {
            console.log(`Client price deviation too high, using oracle price for ${pair.from}-${pair.to}`)
          }
        }

        const priceInfo: PriceInfo = {
          from: pair.from,
          to: pair.to,
          price: mainPrice,
          timestamp: Math.floor(Date.now() / 1000),
          rawPrices: prices,
          aggregations,
          stdDev: stdDev,
          sources,
        }

        console.log(`Final price info for ${pair.from}-${pair.to}:`, JSON.stringify(priceInfo))
        return priceInfo
      } catch (error) {
        console.error(`❌ Error fetching price for ${pair.from}-${pair.to}:`, error)
        throw error // Re-throw the error to be caught by the Promise.all
      }
    })
  )

  return results
}
