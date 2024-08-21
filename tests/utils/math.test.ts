import {
  median,
  mean,
  min,
  max,
  relativePriceDifference,
  percentDifference,
  aggregatePrice,
  normalize,
} from "../../src/utils/math"

describe("Math Utils", () => {
  describe("median", () => {
    it("should return the correct median for odd number of values", () => {
      expect(median([1, 3, 2])).toBe(2)
    })

    it("should return the correct median for even number of values", () => {
      expect(median([1, 2, 3, 4])).toBe(2.5)
    })
  })

  describe("mean", () => {
    it("should return the correct mean", () => {
      expect(mean([1, 2, 3])).toBe(2)
    })
  })

  describe("min", () => {
    it("should return the minimum value", () => {
      expect(min([3, 1, 2])).toBe(1)
    })
  })

  describe("max", () => {
    it("should return the maximum value", () => {
      expect(max([3, 1, 2])).toBe(3)
    })
  })

  describe("relativePriceDifference", () => {
    it("should return the correct relative price difference", () => {
      expect(relativePriceDifference(100, 110)).toBe(10)
    })
  })

  describe("percentDifference", () => {
    it("should return the correct percent difference", () => {
      expect(percentDifference(100, 110)).toBeCloseTo(9.52, 2)
    })
  })

  describe("aggregatePrice", () => {
    const prices = [100, 110, 120]

    it("should return the correct median price", () => {
      expect(aggregatePrice(prices, "median")).toBe(110)
    })

    it("should return the correct mean price", () => {
      expect(aggregatePrice(prices, "mean")).toBe(110)
    })

    it("should return the correct min price", () => {
      expect(aggregatePrice(prices, "min")).toBe(100)
    })

    it("should return the correct max price", () => {
      expect(aggregatePrice(prices, "max")).toBe(120)
    })
  })

  describe("normalize", () => {
    it("should normalize the value correctly", () => {
      expect(normalize(1.23456789)).toBe(1234567.89)
    })
  })
})
