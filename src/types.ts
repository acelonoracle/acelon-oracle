// Base JSON-RPC types
export type JsonRpcRequest =
  | FetchPricesRequest
  | CheckExchangeHealthRequest
  | JsonRpcRequestBase

export interface JsonRpcRequestBase {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

export interface JsonRpcSuccessResponse {
  jsonrpc: '2.0'
  id: string | number
  result: any
}

export interface JsonRpcErrorResponse {
  jsonrpc: '2.0'
  id: string | number | null
  error: {
    code: number
    message: string
    data?: any
  }
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse

// FetchPrices Types
export type AggregationType = 'median' | 'mean' | 'min' | 'max'

export type Protocol = 'Substrate' | 'EVM' | 'WASM' | 'Tezos'

export interface PriceInfo {
  from: string
  to: string
  price: Partial<Record<AggregationType, number>>
  validation?: Partial<Record<AggregationType, boolean>>
  timestamp: number
  rawPrices: number[]
  stdDev: number
  sources: Array<{ exchangeId: string; certificate: string }>
}

export interface FetchPricesParams {
  pairs: Array<{
    from: string
    to: string
    price?: number | number[]
  }>
  protocol: Protocol
  exchanges?: string[]
  minSources?: number
  tradeAgeLimit?: number
  aggregation?: AggregationType | AggregationType[]
  maxSourcesDeviation?: number
  maxValidationDiff?: number
}

export interface FetchPricesRequest extends JsonRpcRequestBase {
  method: 'fetchPrices'
  params: FetchPricesParams
}

export interface SignedPrice {
  priceData: {
    from: string
    to: string
    price: number | number[]
    timestamp: number
    sources: Array<{ exchangeId: string; certificate: string }>
    requestHash: string
  }
  packed: string
  signature: string
}

export interface FetchPricesResult {
  priceInfos: PriceInfo[]
  signedPrices: SignedPrice[]
  version: string
}

// CheckExchangeHealth Types
export interface CheckExchangeHealthParams {
  exchanges: string[]
}

export interface CheckExchangeHealthRequest extends JsonRpcRequestBase {
  method: 'checkExchangeHealth'
  params?: CheckExchangeHealthParams
}

export interface ExchangeHealthStatus {
  exchangeId: string
  status: 'up' | 'down'
  responseTime?: number
}

export interface CheckExchangeHealthResult {
  healthStatuses: ExchangeHealthStatus[]
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
  type: 'crypto'
  extractPriceData: (data: any) => { timestamp: number; price: number }
  constructURL: (from: string, to: string) => string
  healthEndpoint: string
  validateHealthResponse: (response: string) => boolean
}
