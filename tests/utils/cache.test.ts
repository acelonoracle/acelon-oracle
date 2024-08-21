import { Cache } from "../../src/utils/cache"

describe("Cache", () => {
  let cache: Cache

  beforeEach(() => {
    jest.useFakeTimers()
    cache = new Cache(1000) // 1 second cache duration for testing
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("should set and get a value", () => {
    cache.set("BTC", "USD", "TEST", 50000, "cert123")
    const result = cache.get("BTC", "USD", "TEST")
    expect(result).toEqual({
      price: 50000,
      timestamp: expect.any(Number),
      sources: [{ exchangeId: "TEST", certificate: "cert123" }],
    })
  })

  it("should return undefined for non-existent key", () => {
    const result = cache.get("ETH", "USD", "TEST")
    expect(result).toBeUndefined()
  })

  it("should expire entries after cache duration", () => {
    cache.set("BTC", "USD", "TEST", 50000, "cert123")
    jest.advanceTimersByTime(1001) // Advance time just past cache duration
    const result = cache.get("BTC", "USD", "TEST")
    expect(result).toBeUndefined()
  })

  it("should get all valid entries for a pair", () => {
    cache.set("BTC", "USD", "TEST1", 50000, "cert123")
    cache.set("BTC", "USD", "TEST2", 51000, "cert456")
    const results = cache.getAll("BTC", "USD")
    expect(results).toHaveLength(2)
    expect(results[0].price).toBe(50000)
    expect(results[1].price).toBe(51000)
  })

  it("should filter results by exchange", () => {
    cache.set("BTC", "USD", "TEST1", 50000, "cert123")
    cache.set("BTC", "USD", "TEST2", 51000, "cert456")
    const results = cache.getAll("BTC", "USD", ["TEST1"])
    expect(results).toHaveLength(1)
    expect(results[0].price).toBe(50000)
  })
})
