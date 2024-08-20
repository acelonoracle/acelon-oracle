import { log } from "console"
import { AGGREGATION_TYPE, DEVIATION_THRESHOLD_PERCENT, MINIMUM_SOURCES, TRADE_AGE_LIMIT } from "../constants"
import { PriceInfo, FetchPricesParams, AggregationType } from "../types"
import { fetchPrice } from "../utils/fetch"
import { aggregatePrice, normalize, relativePriceDifference, standardDeviation } from "../utils/math"

export async function fetchPrices(params: FetchPricesParams): Promise<PriceInfo[]> {
  log(`Starting fetchPrices with params: ${JSON.stringify(params)}`)

  const maxValidationDiffPercent = params.maxValidationDiff || DEVIATION_THRESHOLD_PERCENT
  const tradeAgeLimit = params.tradeAgeLimit || TRADE_AGE_LIMIT
  const minSources = params.minSources || MINIMUM_SOURCES
  const maxSourcesDeviation = params.maxSourcesDeviation

  const aggregationTypes =
    params.aggregation === undefined
      ? [AGGREGATION_TYPE]
      : Array.isArray(params.aggregation)
        ? params.aggregation
        : [params.aggregation]

  log(
    `Using deviation threshold: ${maxValidationDiffPercent}%, trade age limit: ${tradeAgeLimit}ms, minimum sources: ${minSources}, aggregation types: ${aggregationTypes.join(", ")}`
  )

  const results = await Promise.all(
    params.pairs.map(async (pair) => {
      const clientPriceProvided = pair.price !== undefined && pair.timestamp !== undefined
      const clientPrices = Array.isArray(pair.price) ? pair.price : [pair.price]
      let timestamp: number | undefined = undefined

      if (clientPriceProvided && clientPrices.length !== aggregationTypes.length) {
        throw new Error(
          `Number of client prices (${clientPrices.length}) does not match number of aggregation types (${aggregationTypes.length})`
        )
      }

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

        log(`Fetched ${prices.length} valid prices for ${pair.from}-${pair.to}`)

        const sources = priceData.map((data) => ({
          exchangeId: data.exchangeId,
          certificate: data.certificate,
        }))

        // Calculate prices for all aggregation types
        const calculatedPrices: Partial<Record<AggregationType, number>> = {}
        let validations: Partial<Record<AggregationType, boolean>> | undefined = undefined

        aggregationTypes.forEach((aggType, index) => {
          const calculatedPrice = normalize(aggregatePrice(prices, aggType))
          calculatedPrices[aggType] = calculatedPrice

          // Validate against client-provided price if available
          if (pair.price !== undefined && pair.timestamp !== undefined) {
            const clientPrice = clientPrices[index]

            if (clientPrice !== undefined) {
              if (!validations) validations = {}
              const deviation = relativePriceDifference(calculatedPrice, clientPrice)
              log(`Deviation for ${aggType}: ${deviation}%`)

              const isPriceInRange = deviation <= maxValidationDiffPercent
              validations[aggType] = isPriceInRange
              if (isPriceInRange) {
                calculatedPrices[aggType] = clientPrice
                log(`Using client-provided price for ${pair.from}-${pair.to} (${aggType})`)
              } else {
                log(`Client price deviation too high for ${pair.from}-${pair.to} (${aggType}), using oracle price`)
              }

              // Check if the timestamp provided by the client is not older than 1 minute
              const isTimestampValid = Math.abs(pair.timestamp - Date.now()) <= 60 * 1000
              if (isTimestampValid) {
                timestamp = pair.timestamp
              } else {
                log(
                  `Client timestamp too old (max 60s difference) for ${pair.from}-${pair.to} (${aggType}), using oracle timestamp`
                )
              }
            }
          }
        })

        const priceInfo: PriceInfo = {
          from: pair.from,
          to: pair.to,
          price: calculatedPrices,
          timestamp: timestamp || Date.now(),
          rawPrices: prices,
          stdDev: stdDev,
          sources,
        }

        // Only include validations if they exist
        if (validations) {
          priceInfo.validation = validations
        }

        log(`Final price info for ${pair.from}-${pair.to}: ${JSON.stringify(priceInfo)}`)
        return priceInfo
      } catch (error) {
        log(`❌ Error fetching price for ${pair.from}-${pair.to}: ${error}`, "error")
        throw error // Re-throw the error to be caught by the Promise.all
      }
    })
  )

  return results
}
