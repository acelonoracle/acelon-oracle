// Base JSON-RPC types
export type JsonRpcRequest =
  | FetchPricesRequest
  | CheckExchangeHealthRequest
  | PingRequest
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

export type Protocol = 'Substrate' | 'EVM' | 'WASM' | 'Tezos' | 'Youves'

export interface PriceInfo {
  from: string
  to: string
  decimals: number
  price: Partial<Record<AggregationType, bigint>>
  validation?: Partial<Record<AggregationType, boolean>>
  timestamp: number
  rawPrices: number[]
  stdDev: number
  sources: Array<{ exchangeId: string; certificate: string }>
}

export interface PriceError {
  from: string
  to: string
  message: string
}

export interface FetchPricesParams {
  pairs: Array<{
    from: string
    to: string
    decimals?: number
    price?: number | number[]
    timestamp?: number
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

export interface PriceData {
  from: string
  to: string
  decimals: number
  price: bigint[]
  timestamp: number
  sources: Array<{ exchangeId: string; certificate: string }>
  requestHash: string
}

export interface SignedPrice {
  priceData: PriceData
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

// Ping Types
export interface PingRequest extends JsonRpcRequestBase {
  method: 'ping'
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
