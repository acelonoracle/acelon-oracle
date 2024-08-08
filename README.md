# Acurast Oracle Service

## Overview

Acurast Oracle is a decentralized price oracle service built on the Acurast network. It provides real-time cryptocurrency price data by aggregating information from multiple exchanges, ensuring high reliability and accuracy.

## Features

- Fetches price data from multiple cryptocurrency exchanges
- Supports various aggregation methods (median, mean, min, max)
- Allows price validation
- Allows custom configuration of data sources and parameters
- Provides signed price data for on-chain verification


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
    "exchanges": ["BNC", "CBP", "BFX"],
    "aggregationType": "median",
    "minSources": 3,
    "tradeAgeLimit": 300000,
    "maxSourcesDeviation": 0.05,
    "maxValidationDiff": 0.05
  }
}
```

#### Parameters Explanation

- `pairs`: An array of currency pairs to fetch prices for. Each pair consists of:
  - `from`: The base currency (e.g., "BTC")
  - `to`: The quote currency (e.g., "USD")
  - `price` (optional): A client-provided price for validation

- `exchanges` (optional): An array of exchange IDs to fetch prices from. If not provided, all available exchanges will be used.

- `aggregationType` (optional): The method used to aggregate prices from multiple sources. Possible values are:
  - `"median"` (default)
  - `"mean"`
  - `"min"`
  - `"max"`

- `minSources` (optional): The minimum number of valid price sources required to consider the aggregated price valid. Default is 3.

- `tradeAgeLimit` (optional): The maximum age (in milliseconds) of a trade to be considered valid. Default is 5 minutes (300000 ms).

- `maxSourcesDeviation` (optional): The maximum allowed standard deviation among prices from different sources. If exceeded, an error is thrown.

- `maxValidationDiff` (optional): The maximum allowed percentage difference between the aggregated price and a client-provided price (if given). Default is 0.05%.

### Supported Exchanges

The oracle supports fetching price data from the following exchanges:

| Exchange ID | Exchange Name | 
|-------------|---------------|
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
        "price": 50000000000,
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
        "pair": "BTCUSD",
        "packedPrice": "...",
        "signature": "..."
      }
    ],
    "version": "1.0.0"
  }
}
```

- `priceInfos`: An array of price information for each requested pair.
  - `price`: The aggregated price, normalized to 6 decimal places.
  - `timestamp`: The Unix timestamp of the price data.
  - `rawPrices`: An array of individual prices from each source before aggregation.
  - `stdDev`: The standard deviation of the raw prices.
  - `sources`: Information about the exchanges that provided the price data.

- `signedPrices`: An array of signed price data for on-chain verification.
  - `packedPrice`: The price data packed into a binary format.
  - `signature`: The signature of the packed price data.

- `version`: The version of the oracle software.

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

Common error scenarios include:
- Insufficient number of valid price sources
- Excessive price deviation among sources
- Network issues when fetching from exchanges


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


### Testing

To test the project, run:

```bash
yarn test
```

## License

This project is licensed under the MIT License.