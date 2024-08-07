import { PRICE_PRECISION } from "../constants"

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

export function normalize(value: number): number {
  return Math.round(value * PRICE_PRECISION)
}

export function percentDifference(a: number, b: number): number {
  return Math.abs((a - b) / ((a + b) / 2)) * 100
}
