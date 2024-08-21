import { fetchPrice } from "../../src/utils/fetch"
import { cache } from "../../src/utils/cache"
import * as exchanges from "../../src/config/exchanges"

jest.mock("../../src/utils/cache")
jest.mock("../../src/config/exchanges", () => ({
  CONFIGS: [
    { exchange_id: "BNU", name: "Binance US", constructURL: jest.fn(), extractPriceData: jest.fn() },
    { exchange_id: "CBP", name: "Coinbase", constructURL: jest.fn(), extractPriceData: jest.fn() },
  ],
}))

describe("fetchPrice", () => {
  const mockHttpGET = global.httpGET as jest.MockedFunction<typeof global.httpGET>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(cache.getAll as jest.Mock).mockReturnValue([])
    mockHttpGET.mockImplementation((url, headers, successCallback) => {
      successCallback(JSON.stringify({ price: 50000 }), "cert123")
    })
    exchanges.CONFIGS.forEach((config) => {
      ;(config.extractPriceData as jest.Mock).mockReturnValue({ timestamp: Date.now(), price: 50000 })
    })
  })

  it("should fetch prices from multiple exchanges when cache is empty", async () => {
    const result = await fetchPrice("BTC", "USD")

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      price: 50000,
      exchangeId: expect.any(String),
      certificate: "cert123",
    })
  })

  it("should use only cached values when available", async () => {
    const cachedEntry = {
      price: 50000,
      timestamp: Date.now(),
      sources: [{ exchangeId: "TEST", certificate: "cert123" }],
    }
    ;(cache.getAll as jest.Mock).mockReturnValue([cachedEntry])

    const result = await fetchPrice("BTC", "USD", ["TEST"])

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      price: 50000,
      exchangeId: "TEST",
      certificate: "cert123",
    })
    expect(mockHttpGET).not.toHaveBeenCalled()
  })

  it("should handle errors from exchanges", async () => {
    mockHttpGET.mockImplementation((url, headers, successCallback, errorCallback) => {
      errorCallback("Network error")
    })

    const result = await fetchPrice("BTC", "USD")

    expect(result).toHaveLength(0)
  })

  it("should filter exchanges based on provided list", async () => {
    const result = await fetchPrice("BTC", "USD", ["BNU"])

    expect(result).toHaveLength(1)
    expect(result[0].exchangeId).toBe("BNU")
  })
})
