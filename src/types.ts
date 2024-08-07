// Base JSON-RPC types
export type JsonRpcRequest = FetchPricesRequest

export interface JsonRpcRequestBase {
  jsonrpc: "2.0"
  id: string | number
  method: string
  params: any
}

export interface JsonRpcSuccessResponse {
  jsonrpc: "2.0"
  id: string | number
  result: any
}

export interface JsonRpcErrorResponse {
  jsonrpc: "2.0"
  id: string | number | null
  error: {
    code: number
    message: string
    data?: any
  }
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse

// FetchPrices specific types
export interface FetchPricesParams {
  pairs: Array<{ from: string; to: string; price?: number }>
  exchanges?: string[] // Optional
  minimumSources?: number // Optional
  deviationThresholdPercent?: number // Optional
  tradeAgeLimit?: number // Optional
}

export interface FetchPricesRequest extends JsonRpcRequestBase {
  method: "fetchPrices"
  params: FetchPricesParams
}

export interface PriceInfo {
  from: string
  to: string
  price: number
  timestamp: number
  sources: Array<{
    exchangeId: string
    certificate: string
  }>
}

export interface SignedPrice {
  pair: string
  packedPrice: string
  signature: string
}

export interface FetchPricesResult {
  priceInfos: PriceInfo[]
  signedPrices: SignedPrice[]
  version: string
}

// Other types
export interface WebSocketPayload {
  sender: string
  recipient: string
  payload: string
}

export interface ExchangeConfig {
  name: string
  exchange_id: string
  type: "crypto"
  extractPriceData: (data: any) => { timestamp: number; price: number }
  constructURL: (from: string, to: string) => string
}
