import { getDexNodes, findDexPairConfig } from "../config/dexes"
import { cache } from "./cache"
import { log } from "./sentry"
import { DexNodeConfig } from "../types"

declare const httpGET: any
declare const httpPOST: any

// Fetches price data for a given currency pair from DEX nodes
export async function fetchDexPrice(
  from: string,
  to: string,
  tradeAgeLimit?: number
): Promise<Array<{ price: number; exchangeId: string; certificate: string }>> {
  const pair = `${from}-${to}`
  log(`🔗 Fetching DEX price for ${pair}`)

  // Find DEX configuration for the pair across all chains
  const dexInfo = findDexPairConfig(pair)
  if (!dexInfo) {
    throw new Error(`No DEX configuration found for pair ${pair}`)
  }

  const { chain, config: pairConfig } = dexInfo
  log(`Using DEX chain: ${chain}`)

  // Get available nodes for the chain
  const allNodes = getDexNodes(chain)
  if (allNodes.length === 0) {
    throw new Error(`No available nodes found for chain ${chain}`)
  }

  log(`Using ${allNodes.length} nodes: ${allNodes.map((node) => `${node.id}(${node.url})`).join(", ")}`)

  // Check cache for existing entries - use node IDs for cache lookup
  const allNodeIds = allNodes.map((node) => node.id)
  const cachedEntries = cache.getAll(from, to, allNodeIds)
  const cachedNodeIds = new Set(cachedEntries.flatMap((entry) => entry.sources.map((source) => source.exchangeId)))

  // Determine which nodes need to be fetched (not in cache)
  const nodesToFetch = allNodes.filter((node) => !cachedNodeIds.has(node.id))

  log(`Fetching from ${nodesToFetch.length} nodes: ${nodesToFetch.map((node) => `${node.id}(${node.url})`).join(", ")}`)

  // Fetch prices from nodes for non-cached entries
  const promises = nodesToFetch.map((node) => fetchFromNode(node, pairConfig, from, to, tradeAgeLimit))
  const results = await Promise.allSettled(promises)

  // Process fetched results
  const fetchedResults = results
    .filter((result): result is PromiseFulfilledResult<{ price: number; exchangeId: string; certificate: string }> => {
      if (result.status === "rejected") {
        log(`❌ Error fetching DEX price for ${pair} from node: ${result.reason}`, "error")
        return false
      }
      return true
    })
    .map((result) => result.value)

  log(`✅ Successfully fetched ${fetchedResults.length} new DEX prices`)

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

// Fetches price data from a specific DEX node
async function fetchFromNode(
  node: DexNodeConfig,
  pairConfig: any,
  from: string,
  to: string,
  tradeAgeLimit?: number
): Promise<{ price: number; exchangeId: string; certificate: string }> {
  log(`🌍 Fetching DEX price from ${node.id}(${node.url}) for ${from}-${to}`)

  // Check cache first - use node ID for cache
  const cachedEntry = cache.get(from, to, node.id)
  if (cachedEntry) {
    return { price: cachedEntry.price, exchangeId: node.id, certificate: cachedEntry.sources[0].certificate }
  }

  // Create a promise that rejects after 10 seconds
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`⌛ Timeout after 10 seconds for ${node.id}(${node.url})`)), 10000)
  })

  // Determine if this is a view call (POST) or regular call (GET)
  const isViewCall = !!pairConfig.viewCall

  let httpPromise: Promise<{ price: number; exchangeId: string; certificate: string }>

  if (isViewCall) {
    // Handle Michelson view calls with POST
    httpPromise = handleViewCall(node, pairConfig, from, to, tradeAgeLimit)
  } else {
    // Handle regular GET calls
    httpPromise = handleGetCall(node, pairConfig, from, to, tradeAgeLimit)
  }

  // Race the http promise against the timeout promise
  try {
    return await Promise.race([httpPromise, timeoutPromise])
  } catch (error) {
    log(`❌ Error fetching from DEX node ${node.id}(${node.url}): ${error}`, "error", true)
    throw error
  }
}

// Handle Michelson view calls (POST)
function handleViewCall(
  node: DexNodeConfig,
  pairConfig: any,
  from: string,
  to: string,
  tradeAgeLimit?: number
): Promise<{ price: number; exchangeId: string; certificate: string }> {
  return new Promise((resolve, reject) => {
    const url = `${node.url}/chains/main/blocks/head/helpers/scripts/run_script_view`

    const requestBody = {
      contract: pairConfig.contract,
      view: pairConfig.viewCall.viewName,
      input: pairConfig.viewCall.input || { prim: "Unit" },
      unlimited_gas: true,
      chain_id: pairConfig.viewCall.chain_id || "NetXdQprcVkpaWU", // Mainnet chain ID
      unparsing_mode: pairConfig.viewCall.unparsing_mode || "Readable",
    }

    httpPOST(
      url,
      JSON.stringify(requestBody),
      {
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.52 Safari/537.36",
        "content-type": "application/json",
      },
      (rawResponse: string, certificate: string) => {
        try {
          log(`Received DEX view response from ${node.url}`)
          const response = JSON.parse(rawResponse)
          const priceData = pairConfig.extractPriceData(response)
          log(`Extracted DEX price data from ${node.url}: ${JSON.stringify(priceData)}`)

          if (isNaN(priceData.price)) {
            throw new Error(`Invalid DEX price data from ${node.url}: ${priceData.price}`)
          }

          if (tradeAgeLimit && Date.now() - priceData.timestamp > tradeAgeLimit) {
            log(`🚨 DEX trade age exceeds limit for ${node.url}`, "warn")
            reject(new Error(`DEX trade age exceeds limit for ${node.url}`))
          } else {
            // Cache the fetched price
            cache.set(from, to, node.id, priceData.price, certificate)
            resolve({ price: priceData.price, exchangeId: node.id, certificate })
          }
        } catch (error) {
          log(`❌ Error processing DEX view response from ${node.url}: ${error}`, "error")
          reject(error)
        }
      },
      (errorMessage: string) => {
        log(`❌ HTTP POST error for DEX view node ${node.url}: ${errorMessage}`, "error", true)
        reject(new Error(`${node.url}: ${errorMessage}`))
      }
    )
  })
}

// Handle regular GET calls
function handleGetCall(
  node: DexNodeConfig,
  pairConfig: any,
  from: string,
  to: string,
  tradeAgeLimit?: number
): Promise<{ price: number; exchangeId: string; certificate: string }> {
  return new Promise((resolve, reject) => {
    const url = `${node.url}${pairConfig.rpcPath}`

    httpGET(
      url,
      {
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.52 Safari/537.36",
        "content-type": "application/json",
      },
      (rawResponse: string, certificate: string) => {
        try {
          log(`Received DEX response from ${node.url}`)
          const response = JSON.parse(rawResponse)
          const priceData = pairConfig.extractPriceData(response)
          log(`Extracted DEX price data from ${node.url}: ${JSON.stringify(priceData)}`)

          if (isNaN(priceData.price)) {
            throw new Error(`Invalid DEX price data from ${node.url}: ${priceData.price}`)
          }

          if (tradeAgeLimit && Date.now() - priceData.timestamp > tradeAgeLimit) {
            log(`🚨 DEX trade age exceeds limit for ${node.url}`, "warn")
            reject(new Error(`DEX trade age exceeds limit for ${node.url}`))
          } else {
            // Cache the fetched price
            cache.set(from, to, node.id, priceData.price, certificate)
            resolve({ price: priceData.price, exchangeId: node.id, certificate })
          }
        } catch (error) {
          log(`❌ Error processing DEX response from ${node.url}: ${error}`, "error")
          reject(error)
        }
      },
      (errorMessage: string) => {
        log(`❌ HTTP GET error for DEX node ${node.url}: ${errorMessage}`, "error", true)
        reject(new Error(`${node.url}: ${errorMessage}`))
      }
    )
  })
}
