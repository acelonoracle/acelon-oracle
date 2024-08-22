import { signPrices } from "../../src/methods/signPrices"
import { FetchPricesParams, PriceInfo } from "../../src/types"

describe("signPrices", () => {
  it("should sign prices correctly", async () => {
    const mockPack = jest.fn().mockReturnValue("packedData")
    const mockSign = jest.fn().mockReturnValue("signature")

    global._STD_.chains.tezos.encoding.pack = mockPack
    global._STD_.chains.tezos.signer.sign = mockSign

    const params: FetchPricesParams = {
      pairs: [{ from: "BTC", to: "USD" }],
      protocol: "Tezos",
      minSources: 2,
    }

    const priceInfos: PriceInfo[] = [
      {
        from: "BTC",
        to: "USD",
        decimals: 8,
        price: { mean: 50000 },
        timestamp: 1234567890,
        sources: [
          { exchangeId: "TEST1", certificate: "cert1" },
          { exchangeId: "TEST2", certificate: "cert2" },
        ],
        rawPrices: [49900, 50100],
        stdDev: 100,
      },
    ]

    const result = await signPrices(priceInfos, params)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      priceData: {
        from: "BTC",
        to: "USD",
        decimals: 8,
        price: [50000],
        timestamp: 1234567890,
        sources: [
          {
            exchangeId: "TEST1",
            certificate: "cert1",
          },
          {
            exchangeId: "TEST2",
            certificate: "cert2",
          },
        ],
        requestHash: "b3b3ee9fadc10e7f89373a0e89606cb9e1ef1099c60a7464fad3137a4e6e8d93",
      },
      packed: "packedData",
      signature: "signature",
    })
    
  })
})
