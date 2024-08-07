import { ExchangeConfig } from "../types"

// ==== CRYPTO ====
const COINBASE_TEMPLATE = `https://api.pro.coinbase.com/products/<<FROM>>-<<TO>>/trades?limit=1`
const GEMINI_TEMPLATE = `https://api.gemini.com/v1/trades/<<FROM>><<TO>>?limit_trades=1`
const BITFINEX_TEMPLATE = `https://api-pub.bitfinex.com/v2/trades/t<<FROM>><<TO>>/hist?limit=1&sort=-1`
const KRAKEN_TEMPLATE = `https://api.kraken.com/0/public/Trades?pair=<<FROM>><<TO>>&count=1`
const CRYPTO_COM_TEMPLATE = `https://api.crypto.com/exchange/v1/public/get-trades?instrument_name=<<FROM>>_<<TO>>&count=1`
const BINANCE_US_TEMPLATE = `https://api.binance.us/api/v3/trades?symbol=<<FROM>><<TO>>&limit=1`
const BINANCE_TEMPLATE = `https://api.binance.com/api/v3/trades?symbol=<<FROM>><<TO>>&limit=1`
const BYBIT_TEMPLATE = `https://api.bybit.com/v5/market/recent-trade?category=spot&symbol=<<FROM>><<TO>>&limit=1`
const KUCOIN_TEMPLATE = `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=<<FROM>>-<<TO>>`
const GATE_IO_TEMPLATE = `https://api.gateio.ws/api/v4/spot/trades/?currency_pair=<<FROM>>_<<TO>>&limit=1`
const HTX_TEMPLATE = `https://api.huobi.pro/market/trade?symbol=<<FROM>><<TO>>`
const MEXC_TEMPLATE = `https://api.mexc.com/api/v3/trades?symbol=<<FROM>><<TO>>&limit=1`
const WHITEBIT_TEMPLATE = `https://whitebit.com/api/v4/public/trades/<<FROM>>_<<TO>>`

//API configs
//the configs are used to fetch data from the exchanges
//each api has different answers so we configure each api to extract price data from the response

export const CONFIGS: ExchangeConfig[] = [
  {
    name: "Binance US",
    exchange_id: "BNU",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1
      const timestampIndex = 4
      const priceIndex = 1

      let priceData = Object.values(Object.values(data)[0]!)

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return BINANCE_US_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "Binance",
    exchange_id: "BNC",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1
      const timestampIndex = 4
      const priceIndex = 1

      let priceData = Object.values(Object.values(data)[0]!)

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return BINANCE_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "Coinbase",
    exchange_id: "CBP",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1
      const timestampIndex = 4
      const priceIndex = 3

      let priceData: any[] = Object.values(data[0])
      priceData[timestampIndex] = new Date(priceData[timestampIndex]).valueOf()

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return COINBASE_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "Bitfinex",
    exchange_id: "BFX",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1
      const timestampIndex = 1
      const priceIndex = 3

      let priceData = data[0]

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      from = from == "USDT" ? "UST" : from
      to = to == "USDT" ? "UST" : to

      return BITFINEX_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "Kraken",
    exchange_id: "KRK",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1000
      const timestampIndex = 2
      const priceIndex = 0

      let priceData = (Object.values(data["result"]) as any[])[0][0]
      priceData[timestampIndex] = Math.floor(priceData[timestampIndex])

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return KRAKEN_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "Bybit",
    exchange_id: "BYB",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1
      const timestampIndex = 5
      const priceIndex = 2

      let priceData: any[] = Object.values(data["result"]["list"][0])

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return BYBIT_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "Gemini",
    exchange_id: "GEM",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1
      const timestampIndex = 1
      const priceIndex = 3

      let priceData: any[] = Object.values(data[0])

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return GEMINI_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "Kucoin",
    exchange_id: "KUC",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1
      const timestampIndex = 0
      const priceIndex = 2

      let priceData: any[] = Object.values(data["data"])

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return KUCOIN_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "Gate IO",
    exchange_id: "GIO",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1000
      const timestampIndex = 1
      const priceIndex = 6

      let priceData: any[] = Object.values(data[0])

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return GATE_IO_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "Crypto.com",
    exchange_id: "CRY",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1
      const timestampIndex = 3
      const priceIndex = 1

      let priceData: any[] = Object.values(data["result"]["data"][0])

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return CRYPTO_COM_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "HTX",
    exchange_id: "HTX",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1
      const timestampIndex = 1
      const priceIndex = 4

      let priceData: any[] = Object.values(data["tick"]["data"][0])

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return HTX_TEMPLATE.replace("<<FROM>>", from.toLowerCase()).replace("<<TO>>", to.toLowerCase())
    },
  },
  {
    name: "MEXC",
    exchange_id: "MEXC",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 1
      const timestampIndex = 4
      const priceIndex = 1

      let priceData: any[] = Object.values(data[0])

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return MEXC_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
  {
    name: "Whitebit",
    exchange_id: "WBIT",
    type: "crypto",
    extractPriceData: (data) => {
      const timestampFactor = 100
      const timestampIndex = 4
      const priceIndex = 1

      let priceData: any[] = Object.values(data[0])

      return {
        timestamp: priceData[timestampIndex] * timestampFactor,
        price: parseFloat(priceData[priceIndex]),
      }
    },
    constructURL: (from, to) => {
      return WHITEBIT_TEMPLATE.replace("<<FROM>>", from).replace("<<TO>>", to)
    },
  },
]
