import { CONFIGS } from "../config/exchanges"
import { CheckExchangeHealthParams, ExchangeHealthStatus } from "../types"

declare const httpGET: any

export async function checkExchangeHealth(params?: CheckExchangeHealthParams): Promise<ExchangeHealthStatus[]> {
  console.log("Starting exchange health check")

  const exchangesToCheck = params && params.exchanges ? params.exchanges : CONFIGS.map((config) => config.exchange_id)

  const healthChecks = exchangesToCheck.map(async (exchangeId) => {
    const config = CONFIGS.find((c) => c.exchange_id === exchangeId)
    if (!config) {
      console.log(`Exchange ${exchangeId} not found in configurations`)
      return {
        exchangeId,
        status: "down" as const,
      }
    }

    try {
      const start = Date.now()
      const response = await new Promise<string>((resolve, reject) => {
        httpGET(
          config.healthEndpoint,
          {
            "user-agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.52 Safari/537.36",
          },
          (response: string) => resolve(response),
          (error: string) => reject(new Error(error))
        )
      })

      let isHealthy = false
      try {
        isHealthy = config.validateHealthResponse(response)
      } catch (error) {
        console.error(`Error validating health response for ${exchangeId}:`, error)
        isHealthy = false
      }

      const responseTime = Date.now() - start
      console.log(
        `Exchange ${exchangeId} health check completed, status: ${isHealthy ? "up" : "down"}, response time: ${responseTime}ms`
      )

      return {
        exchangeId,
        status: isHealthy ? ("up" as const) : ("down" as const),
        responseTime: isHealthy ? responseTime : undefined,
      }
    } catch (error) {
      console.error(`Error checking health for ${exchangeId}:`, error)
      return {
        exchangeId,
        status: "down" as const,
      }
    }
  })

  return Promise.all(healthChecks)
}
