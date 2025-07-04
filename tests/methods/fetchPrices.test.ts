import { normalize } from '../../src/utils/math'
import { DEFAULT_DECIMALS } from '../../src/constants'
import { fetchPrices } from '../../src/methods/fetchPrices'
import { FetchPricesParams } from '../../src/types'
import { fetchPrice } from '../../src/utils/fetch'

jest.mock('../../src/utils/fetch')

describe('fetchPrices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch prices and return price info', async () => {
    const mockFetchPrice = fetchPrice as jest.MockedFunction<typeof fetchPrice>
    mockFetchPrice.mockResolvedValue([
      { price: 50000, exchangeId: 'TEST1', certificate: 'cert1' },
      { price: 51000, exchangeId: 'TEST2', certificate: 'cert2' },
    ])

    const params: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'Tezos',
      minSources: 2,
    }

    const { priceInfos, priceErrors } = await fetchPrices(params)
    const result = priceInfos

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      from: 'BTC',
      to: 'USD',
      price: { median: normalize(50500, DEFAULT_DECIMALS) },
      timestamp: expect.any(Number),
      sources: expect.arrayContaining([
        { exchangeId: 'TEST1', certificate: 'cert1' },
        { exchangeId: 'TEST2', certificate: 'cert2' },
      ]),
    })
  })

  it('should use client-provided price if within threshold', async () => {
    const mockFetchPrice = fetchPrice as jest.MockedFunction<typeof fetchPrice>
    mockFetchPrice.mockResolvedValue([
      { price: 50000, exchangeId: 'TEST1', certificate: 'cert1' },
      { price: 51000, exchangeId: 'TEST2', certificate: 'cert2' },
    ])

    const params: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD', price: 50500 }],
      protocol: 'Tezos',
      minSources: 2,
    }

    const { priceInfos, priceErrors } = await fetchPrices(params)
    const result = priceInfos

    expect(result[0].price.median).toBe(normalize(50500, DEFAULT_DECIMALS))
  })

  it('should throw an error if not enough sources', async () => {
    const mockFetchPrice = fetchPrice as jest.MockedFunction<typeof fetchPrice>
    mockFetchPrice.mockResolvedValue([
      { price: 50000, exchangeId: 'TEST1', certificate: 'cert1' },
    ])

    const params: FetchPricesParams = {
      pairs: [{ from: 'BTC', to: 'USD' }],
      protocol: 'Tezos',
      minSources: 2,
    }

    await expect(fetchPrices(params)).rejects.toThrow('Not enough sources')
  })

  it('should automatically fetch DEX prices for supported pairs', async () => {
    const mockFetchPrice = fetchPrice as jest.MockedFunction<typeof fetchPrice>
    mockFetchPrice.mockResolvedValue([
      { price: 1.5, exchangeId: 'tezos-node-1', certificate: 'dex-cert1' },
      { price: 1.52, exchangeId: 'tezos-node-2', certificate: 'dex-cert2' },
    ])

    const params: FetchPricesParams = {
      pairs: [{ 
        from: 'STXTZ', 
        to: 'XTZ'
      }],
      protocol: 'Tezos',
      minSources: 2,
    }

    const { priceInfos, priceErrors } = await fetchPrices(params)

    expect(priceInfos).toHaveLength(1)
    expect(priceInfos[0]).toMatchObject({
      from: 'STXTZ',
      to: 'XTZ',
      price: { median: normalize(1.51, DEFAULT_DECIMALS) },
      sources: expect.arrayContaining([
        { exchangeId: 'tezos-node-1', certificate: 'dex-cert1' },
        { exchangeId: 'tezos-node-2', certificate: 'dex-cert2' },
      ]),
    })

    // Verify fetchPrice was called with new simplified parameters
    expect(mockFetchPrice).toHaveBeenCalledWith(
      'STXTZ',
      'XTZ',
      undefined, // exchanges
      expect.any(Number) // tradeAgeLimit
    )
  })
})
