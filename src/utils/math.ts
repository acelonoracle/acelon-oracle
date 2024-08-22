import { PRICE_PRECISION } from "../constants"
import { AggregationType } from "../types"

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    const left = sorted[middle - 1]
    const right = sorted[middle]
    return (left + right) / 2
  } else {
    return sorted[middle]
  }
}

export function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function min(values: number[]): number {
  return Math.min(...values)
}

export function max(values: number[]): number {
  return Math.max(...values)
}

export function relativePriceDifference(basePrice: number, comparisonPrice: number): number {
  return Math.abs((comparisonPrice - basePrice) / basePrice) * 100
}

export function percentDifference(a: number, b: number): number {
  return Math.abs((a - b) / ((a + b) / 2)) * 100
}

export function aggregatePrice(prices: number[], aggregationType: AggregationType): number {
  switch (aggregationType) {
    case "median":
      return median(prices)
    case "mean":
      return mean(prices)
    case "min":
      return min(prices)
    case "max":
      return max(prices)
    default:
      return median(prices) // Default to median if an invalid type is provided
  }
}

export function normalize(value: number, precision: number): number {
  return Math.round(value * 10 ** precision)
}

export function standardDeviation(values: number[]): number {
  const avg = mean(values)
  const squareDiffs = values.map((value) => Math.pow(value - avg, 2))
  const avgSquareDiff = mean(squareDiffs)
  return Math.sqrt(avgSquareDiff)
}
