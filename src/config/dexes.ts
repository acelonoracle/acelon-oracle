import { DexNodeConfig, DexPairConfig } from "../types"

// Simple map of chain -> node configurations
export const DEX_NODES: Record<string, DexNodeConfig[]> = {
  tezos: [
    { id: "papers", url: "https://tezos-node-rolling.prod.gke.papers.tech" },
    { id: "ecadinfra", url: "https://mainnet.tezos.ecadinfra.com" },
    { id: "smartpy", url: "https://mainnet.smartpy.io" },
    { id: "tzbeta", url: "https://rpc.tzbeta.net" },
    { id: "tzkt", url: "https://rpc.tzkt.io/mainnet" },
  ],
}

// DEX pair configurations
export const DEX_PAIRS: Record<string, DexPairConfig[]> = {
  tezos: [
    {
      pair: "STXTZ-XTZ",
      contract: "KT1FRN2RmitUkyyovtjRMrU1G9zwKzgESXm8",
      viewCall: {
        viewName: "fetch_price",
        input: { prim: "Unit" },
        chain_id: "NetXdQprcVkpaWU",
        unparsing_mode: "Readable",
      },
      extractPriceData: (data: any) => {
        try {
          // The fetch_price view returns: {"data":{"int":"1011397"}}
          const price = data.data?.int
          if (!price) {
            throw new Error("No price data found in response")
          }

          //convert price to no decimals
          const floatPrice = parseFloat(price) * 10 ** -6

          return { timestamp: Date.now(), price: floatPrice }
        } catch (error) {
          throw new Error(`Failed to extract price data: ${error}`)
        }
      },
      healthCheck: {
        endpoint: "/chains/main/blocks/head/header",
        validateResponse: (response: string) => {
          try {
            const data = JSON.parse(response)
            return data.level !== undefined
          } catch {
            return false
          }
        },
      },
    },
  ],
}

// Helper functions to find configurations
export function getDexNodes(chain: string): DexNodeConfig[] {
  return DEX_NODES[chain] || []
}

export function getAvailableDexPairs(chain: string): string[] {
  const chainPairs = DEX_PAIRS[chain]
  return chainPairs ? chainPairs.map((p) => p.pair) : []
}

// Helper function to find DEX configuration for a pair across all chains
export function findDexPairConfig(pair: string): { chain: string; config: DexPairConfig } | undefined {
  for (const [chain, chainPairs] of Object.entries(DEX_PAIRS)) {
    const config = chainPairs.find((p) => p.pair === pair)
    if (config) {
      return { chain, config }
    }
  }
  return undefined
}

// Helper function to check if a pair is supported by any DEX
export function isDexPairSupported(from: string, to: string): boolean {
  const pair = `${from}-${to}`
  return findDexPairConfig(pair) !== undefined
}
