import { log } from '../utils/sentry'
import {
  AGGREGATION_TYPE,
  DEVIATION_THRESHOLD_PERCENT,
  MINIMUM_SOURCES,
  DEFAULT_DECIMALS,
  TRADE_AGE_LIMIT,
} from '../constants'
import {
  PriceInfo,
  FetchPricesParams,
  AggregationType,
  PriceError,
} from '../types'
import { fetchPrice } from '../utils/fetch'
import {
  aggregatePrice,
  normalize,
  relativePriceDifference,
  standardDeviation,
} from '../utils/math'
import { bigIntReplacer } from '../utils/util'

export async function fetchPrices(
  params: FetchPricesParams
): Promise<{ priceInfos: PriceInfo[]; priceErrors: PriceError[] }> {
  log(
    `Starting fetchPrices with params: ${JSON.stringify(params, bigIntReplacer)}`
  )

  const maxValidationDiffPercent =
    params.maxValidationDiff || DEVIATION_THRESHOLD_PERCENT
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
    `Using deviation threshold: ${maxValidationDiffPercent}%, trade age limit: ${tradeAgeLimit}ms, minimum sources: ${minSources}, aggregation types: ${aggregationTypes.join(', ')}`
  )

  const results = await Promise.allSettled(
    params.pairs.map(async (pair) => {
      try {
        const clientPriceProvided =
          pair.price !== undefined && pair.timestamp !== undefined
        const clientPrices = Array.isArray(pair.price)
          ? pair.price
          : [pair.price]
        let timestamp: number | undefined = undefined

        if (
          clientPriceProvided &&
          clientPrices.length !== aggregationTypes.length
        ) {
          throw new Error(
            `Number of client prices (${clientPrices.length}) does not match number of aggregation types (${aggregationTypes.length})`
          )
        }

        const priceData = await fetchPrice(
          pair.from,
          pair.to,
          params.exchanges,
          tradeAgeLimit
        )
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
        const calculatedPrices: Partial<Record<AggregationType, bigint>> = {}
        let validations: Partial<Record<AggregationType, boolean>> | undefined =
          undefined

        aggregationTypes.forEach((aggType, index) => {
          const calculatedPrice = normalize(
            aggregatePrice(prices, aggType),
            pair.decimals || DEFAULT_DECIMALS
          )
          calculatedPrices[aggType] = calculatedPrice

          // Validate against client-provided price if available
          if (pair.price !== undefined && pair.timestamp !== undefined) {
            const clientPrice = clientPrices[index]

            if (clientPrice !== undefined) {
              if (!validations) validations = {}
              const deviation = relativePriceDifference(
                Number(calculatedPrice),
                clientPrice
              )
              log(`Deviation for ${aggType}: ${deviation}%`)

              const isPriceInRange = deviation <= maxValidationDiffPercent
              validations[aggType] = isPriceInRange
              if (isPriceInRange) {
                calculatedPrices[aggType] = BigInt(clientPrice)
                log(
                  `Using client-provided price for ${pair.from}-${pair.to} (${aggType})`
                )
              } else {
                log(
                  `Client price deviation too high for ${pair.from}-${pair.to} (${aggType}), using oracle price`
                )
              }

              // Check if the timestamp provided by the client is not older than 1 minute
              const isTimestampValid =
                Math.abs(pair.timestamp - Date.now()) <= 60 * 1000
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
          decimals: pair.decimals || DEFAULT_DECIMALS,
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

        log(
          `Final price info for ${pair.from}-${pair.to}: ${JSON.stringify(priceInfo, bigIntReplacer)}`
        )
        return { success: true, priceInfo }
      } catch (error) {
        log(
          `❌ Error fetching price for ${pair.from}-${pair.to}: ${error}`,
          'error'
        )
        return {
          success: false,
          error: {
            from: pair.from,
            to: pair.to,
            message: error instanceof Error ? error.message : String(error),
          },
        }
      }
    })
  )

  const priceInfos: PriceInfo[] = []
  const priceErrors: PriceError[] = []

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      if (result.value.success && result.value.priceInfo) {
        priceInfos.push(result.value.priceInfo)
      } else if (result.value.error) {
        priceErrors.push(result.value.error)
      }
    } else {
      priceErrors.push({
        from: 'unknown',
        to: 'unknown',
        message:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      })
    }
  })

  // New code: Throw an error if there are only priceErrors and no priceInfos
  if (priceInfos.length === 0 && priceErrors.length > 0) {
    const errorMessages = priceErrors
      .map((error) => `${error.from}-${error.to}: ${error.message}`)
      .join('; ')
    throw new Error(`Failed to fetch prices: ${errorMessages}`)
  }

  return { priceInfos, priceErrors }
}
