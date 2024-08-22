# Acurast Oracle Service

## Overview

Acurast Oracle is a decentralized price oracle service built on the Acurast network. It provides real-time cryptocurrency price data by aggregating information from multiple exchanges, ensuring high reliability and accuracy.

## Features

- Fetches price data from multiple cryptocurrency exchanges
- Implements caching to optimize performance and reduce API calls
- Supports various aggregation methods (median, mean, min, max)
- Allows price validation
- Allows custom configuration of data sources and parameters
- Provides signed price data for on-chain verification
- Supports multiple blockchain protocols (Substrate, EVM, WASM, Tezos)
- Includes exchange API health checking functionality

## Installation

1. Clone the repository:

   ```
   git clone https://github.com/acurast/acurast-oracle-service.git
   cd acurast-oracle-service
   ```

2. Install dependencies:
   ```
   yarn install
   ```

## Build the Project

To build the project, run:

```bash
yarn bundle
```

This will generate a file called `bundle.js` in the `/dist` directory. This is the file that will be running on the Acurast processors, including all dependencies.

## Usage

### Fetching Prices

To fetch prices, send a JSON-RPC request with the following structure:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "fetchPrices",
  "params": {
    "pairs": [
      { "from": "BTC", "to": "USD" },
      { "from": "ETH", "to": "USD" }
    ],
    "protocol": "Substrate",
    "exchanges": ["BNC", "CBP", "BFX"],
    "aggregation": ["median", "mean"],
    "minSources": 3,
    "tradeAgeLimit": 300000,
    "maxValidationDiff": 0.1
  }
}
```

#### Parameters Explanation

- `pairs`: An array of currency pairs to fetch prices for. Each pair consists of:

  - `from`: The from currency (e.g., "BTC")
  - `to`: The to currency (e.g., "USD")
  - `decimals`: (Optional) Decimals of the price (Default: 8)
  - `price` (optional): A client-provided price(s) for validation.

    The prices have to match the aggregation types that were requested. Provide prices that match requested aggregations in the same order.

- `protocol`: The blockchain protocol for which to generate signed price data. Possible values are:

  - `"Substrate"`
  - `"EVM"`
  - `"WASM"`
  - `"Tezos"`

- `exchanges` (optional): An array of exchange IDs to fetch prices from. If not provided, all available exchanges will be used.

- `aggregation`: The method(s) used to aggregate prices from multiple sources. Can be a single value or an array. Possible values are:

  - `"median"` (default if not specified)
  - `"mean"`
  - `"min"`
  - `"max"`

- `minSources` (optional): The minimum number of valid price sources required to consider the aggregated price valid. Default is 3.

- `tradeAgeLimit` (optional): The maximum age (in milliseconds) of a trade to be considered valid. Default is 5 minutes (300000 ms).

- `maxSourcesDeviation` (optional): The maximum allowed standard deviation among prices from different sources. If exceeded, an error is thrown.

- `maxValidationDiff` (optional): The maximum allowed percentage difference between the aggregated price and a client-provided price (if given). Default is 0.05 (5%).

### Supported Exchanges

The oracle supports fetching price data from the following exchanges:

| Exchange ID | Exchange Name |
| ----------- | ------------- |
| BNU         | Binance US    |
| BNC         | Binance       |
| CBP         | Coinbase      |
| BFX         | Bitfinex      |
| KRK         | Kraken        |
| BYB         | Bybit         |
| GEM         | Gemini        |
| KUC         | Kucoin        |
| GIO         | Gate IO       |
| CRY         | Crypto.com    |
| HTX         | HTX           |
| MEXC        | MEXC          |
| WBIT        | Whitebit      |
| OKX         | OKX           |
| UPB         | Upbit         |

### Response

The `fetchPrices` method returns a JSON-RPC response with the following structure:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "priceInfos": [
      {
        "from": "BTC",
        "to": "USD",
        "decimals": 6,
        "price": {
          "median": 50000000000,
          "mean": 50010000000
        },
        "timestamp": 1623456789,
        "rawPrices": [49950.5, 50100.75, 49980.25],
        "stdDev": 64.33,
        "sources": [
          { "exchangeId": "BNC", "certificate": "..." },
          { "exchangeId": "CBP", "certificate": "..." },
          { "exchangeId": "BFX", "certificate": "..." }
        ]
      }
    ],
    "signedPrices": [
      {
        "data": {
          "from": "BTC",
          "to": "USD",
          "decimals": 6,
          "price": [50000000000, 50010000000],
          "timestamp": 1623456789,
          "sources": [
            { "exchangeId": "BNC", "certificate": "..." },
            { "exchangeId": "CBP", "certificate": "..." },
            { "exchangeId": "BFX", "certificate": "..." }
          ],
          "requestHash": "..."
        },
        "packedPrice": "...",
        "signature": "..."
      }
    ],
    "version": "1.0.0"
  }
}
```

- `priceInfos`: An array of price information for each requested pair.

  - `from`: the from symbol.
  - `to`: the to symbol.
  - `decimals`: decimals for the price.
  - `price`: An object containing the aggregated prices for each requested aggregation method.
  - `validation`: An object indicating whether each aggregated price passed the validation check against the client-provided price.
  - `timestamp`: The Unix timestamp of the price data in milliseconds.
  - `rawPrices`: An array of the prices from each source before aggregation.
  - `stdDev`: The standard deviation of the raw prices.
  - `sources`: Map with exchangeId to api certificate.

- `signedPrices`: An array of signed price data for on-chain verification.

  - `data`: The price data that was signed, including the hash of the request parameters.
  - `packedPrice`: The price data packed into the specific chain format.
  - `signature`: The signature of the packed price data.

- `version`: The version of the oracle software.

### Checking Exchange Health

To check the health status of exchanges, send a JSON-RPC request with the following structure:

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "checkExchangeHealth",
  "params": {
    "exchanges": ["BNU", "CBP", "KRK"]
  }
}
```

#### Parameters Explanation

- `exchanges` (optional): An array of exchange IDs to check. If not provided, all configured exchanges will be checked.

The response will include the health status and response time (if available) for each requested exchange.

## Error Handling

If there's an error during the price fetching process, the oracle will return an error response:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "fetchPrices error",
    "data": "Not enough sources for BTC-USD, 2 / 3 sources fetched"
  }
}
```

The error codes follow the JSON RPC 2.0 standard

## Development

### Project Structure

- `src/index.ts`: Main entry point
- `src/methods/`: Core functionality for fetching and processing prices
- `src/utils/`: Utility functions and helper modules
- `src/config/`: Configuration for supported exchanges
- `src/types.ts`: TypeScript type definitions

### Adding New Exchanges

To add a new exchange:

1. Add the exchange configuration to `src/config/exchanges.ts`
2. Implement the `extractPriceData` function for the new exchange
3. Add any necessary URL templates
4. Implement the `healthEndpoint` and `validateHealthResponse` functions for the new exchange

### Testing

To test the project, run:

```bash
yarn test
```

## License

This project is licensed under the MIT License.
