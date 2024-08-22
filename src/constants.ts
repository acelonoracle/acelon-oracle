import { AggregationType } from "./types"

declare const _STD_: any

//read the environment variables from ENV and have a default value if not set
const WSS_URLS_STRING =
  _STD_.env["WSS_URLS"] || "wss://websocket-proxy-1.prod.gke.acurast.com,wss://websocket-proxy-2.prod.gke.acurast.com"
export const WSS_URLS = WSS_URLS_STRING.split(",")

export const MINIMUM_SOURCES = 3

export const DEFAULT_DECIMALS = 8
export const DEVIATION_THRESHOLD_PERCENT = 0.05
export const TRADE_AGE_LIMIT = 5 * 60 * 1000 // 5 min
export const CACHE_DURATION = 60 * 1000 // 1 min
export const AGGREGATION_TYPE: AggregationType = "median"
